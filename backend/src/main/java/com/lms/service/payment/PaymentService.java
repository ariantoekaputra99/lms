package com.lms.service.payment;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lms.dto.PaymentDtos.CheckoutResponse;
import com.lms.dto.PaymentDtos.OrderResponse;
import com.lms.entity.*;
import com.lms.exception.BusinessException;
import com.lms.exception.NotFoundException;
import com.lms.repository.CourseRepository;
import com.lms.repository.EnrollmentRepository;
import com.lms.repository.OrderRepository;
import com.lms.security.CurrentUser;
import com.lms.service.LearningService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ThreadLocalRandom;

@Slf4j
@Service
public class PaymentService {
    private static final DateTimeFormatter CODE_TIME = DateTimeFormatter.ofPattern("yyMMddHHmmss");

    private final OrderRepository orders;
    private final CourseRepository courses;
    private final EnrollmentRepository enrollments;
    private final LearningService learning;
    private final CurrentUser currentUser;
    private final ObjectMapper json;
    private final PaymentGateway gateway;
    private final MidtransGateway midtrans;
    private final boolean simulatorEnabled;

    public PaymentService(OrderRepository orders, CourseRepository courses, EnrollmentRepository enrollments,
                          LearningService learning, CurrentUser currentUser, ObjectMapper json,
                          @Value("${app.payment.midtrans.server-key:}") String serverKey,
                          @Value("${app.payment.midtrans.production:false}") boolean production,
                          @Value("${app.payment.simulator-enabled:true}") boolean simulatorEnabled,
                          @Value("${app.frontend-url}") String frontendUrl) {
        this.orders = orders;
        this.courses = courses;
        this.enrollments = enrollments;
        this.learning = learning;
        this.currentUser = currentUser;
        this.json = json;
        if (serverKey != null && !serverKey.isBlank()) {
            this.midtrans = new MidtransGateway(serverKey.trim(), production, frontendUrl);
            this.gateway = midtrans;
            this.simulatorEnabled = false;
        } else {
            this.midtrans = null;
            this.gateway = simulatorEnabled ? new SimulatorGateway(frontendUrl) : null;
            this.simulatorEnabled = simulatorEnabled;
        }
        log.info("Payment provider: {}", gateway == null ? "NONE (paid courses cannot be bought)" : gateway.name());
    }

    public String providerName() {
        return gateway == null ? "NONE" : gateway.name();
    }

    @Transactional
    public CheckoutResponse checkout(Long courseId) {
        User user = currentUser.get();
        Course course = courses.findById(courseId).orElseThrow(() -> NotFoundException.of("Kursus", courseId));
        if (course.getStatus() != CourseStatus.PUBLISHED) throw new BusinessException("Kursus belum tersedia");
        if (enrollments.existsByUserIdAndCourseId(user.getId(), courseId)) {
            return new CheckoutResponse(true, null, null, null, null, null);
        }
        if (course.isFree()) {
            learning.enroll(user, course);
            return new CheckoutResponse(true, null, null, null, null, null);
        }
        if (gateway == null) throw new BusinessException("Pembayaran belum dikonfigurasi. Hubungi admin");

        // Reuse a pending order for the same course and price instead of creating duplicates.
        var pending = orders.findFirstByUserIdAndCourseIdAndStatusOrderByCreatedAtDesc(user.getId(), courseId, OrderStatus.PENDING)
            .filter(o -> o.getAmount().compareTo(course.getPrice()) == 0 && o.getRedirectUrl() != null
                && o.getProvider().equals(gateway.name()) && o.getCreatedAt().isAfter(OffsetDateTime.now().minusHours(23)));
        if (pending.isPresent()) {
            Order o = pending.get();
            return new CheckoutResponse(false, o.getOrderCode(), o.getStatus(), o.getProvider(), o.getRedirectUrl(), o.getSnapToken());
        }

        OffsetDateTime now = OffsetDateTime.now();
        Order order = orders.save(Order.builder()
            .orderCode("ORD-" + now.format(CODE_TIME) + "-" + ThreadLocalRandom.current().nextInt(1000, 10000))
            .user(user).course(course).amount(course.getPrice()).status(OrderStatus.PENDING)
            .provider(gateway.name()).createdAt(now).build());
        PaymentGateway.Checkout checkout = gateway.createCheckout(order);
        order.setSnapToken(checkout.token());
        order.setRedirectUrl(checkout.redirectUrl());
        orders.save(order);
        return new CheckoutResponse(false, order.getOrderCode(), order.getStatus(), order.getProvider(),
            order.getRedirectUrl(), order.getSnapToken());
    }

    /** Order status for the buyer; refreshes from Midtrans while pending (webhooks can't reach localhost). */
    @Transactional
    public OrderResponse myOrder(String orderCode) {
        Order o = orders.findByOrderCode(orderCode).orElseThrow(() -> NotFoundException.of("Pesanan", orderCode));
        User u = currentUser.get();
        if (!o.getUser().getId().equals(u.getId()) && !CurrentUser.isAdmin(u)) throw new AccessDeniedException("not owner");
        if (o.getStatus() == OrderStatus.PENDING && midtrans != null && "MIDTRANS".equals(o.getProvider())) {
            midtrans.fetchStatus(orderCode).ifPresent(status -> apply(o, status));
        }
        return OrderResponse.from(o);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> myOrders() {
        return orders.findByUserIdOrderByCreatedAtDesc(currentUser.get().getId()).stream().map(OrderResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> allOrders() {
        return orders.findAllByOrderByCreatedAtDesc().stream().map(OrderResponse::from).toList();
    }

    /** Dev simulator: the buyer confirms ("pays") or cancels the order. */
    @Transactional
    public OrderResponse simulate(String orderCode, boolean pay) {
        if (!simulatorEnabled) throw new AccessDeniedException("simulator disabled");
        Order o = orders.findByOrderCode(orderCode).orElseThrow(() -> NotFoundException.of("Pesanan", orderCode));
        if (!o.getUser().getId().equals(currentUser.get().getId())) throw new AccessDeniedException("not owner");
        if (!"SIMULATOR".equals(o.getProvider())) throw new BusinessException("Pesanan ini bukan pesanan simulasi");
        if (o.getStatus() != OrderStatus.PENDING) return OrderResponse.from(o);
        apply(o, Map.of("transaction_status", pay ? "settlement" : "cancel", "payment_type", "simulator",
            "gross_amount", o.getAmount().toPlainString()));
        return OrderResponse.from(o);
    }

    /**
     * Midtrans HTTP notification. The signature is verified first; then the status is re-fetched from
     * the Midtrans API (authoritative) before anything changes. Idempotent.
     */
    @Transactional
    public void handleMidtransNotification(Map<String, Object> body) {
        if (midtrans == null) throw new AccessDeniedException("midtrans not configured");
        String orderId = str(body.get("order_id"));
        if (!midtrans.validSignature(orderId, str(body.get("status_code")), str(body.get("gross_amount")), str(body.get("signature_key")))) {
            log.warn("Rejected Midtrans notification with invalid signature for order {}", orderId);
            throw new AccessDeniedException("invalid signature");
        }
        Order o = orders.findByOrderCode(orderId).orElseThrow(() -> NotFoundException.of("Pesanan", orderId));
        Map<String, Object> status = midtrans.fetchStatus(orderId)
            .orElseThrow(() -> new IllegalStateException("Could not confirm status with Midtrans"));
        apply(o, status);
    }

    /** Maps a provider status onto the order and enrolls the buyer when it becomes PAID. */
    void apply(Order o, Map<String, Object> status) {
        String tx = str(status.get("transaction_status"));
        String fraud = str(status.get("fraud_status"));
        BigDecimal gross = parseAmount(status.get("gross_amount"));
        if (gross != null && gross.compareTo(o.getAmount()) != 0) {
            log.error("Amount mismatch for order {}: expected {}, got {}", o.getOrderCode(), o.getAmount(), gross);
            return;
        }
        OrderStatus next = switch (tx == null ? "" : tx) {
            case "settlement" -> OrderStatus.PAID;
            case "capture" -> fraud == null || "accept".equals(fraud) ? OrderStatus.PAID : OrderStatus.PENDING;
            case "deny", "failure" -> OrderStatus.FAILED;
            case "cancel" -> OrderStatus.CANCELLED;
            case "expire" -> OrderStatus.EXPIRED;
            default -> OrderStatus.PENDING;
        };
        if (o.getStatus() == OrderStatus.PAID) return; // never downgrade a paid order
        o.setStatus(next);
        o.setPaymentType(Objects.toString(status.get("payment_type"), o.getPaymentType()));
        try {
            o.setLastNotification(json.writeValueAsString(status));
        } catch (Exception ignored) {
            // diagnostics only
        }
        if (next == OrderStatus.PAID) {
            o.setPaidAt(OffsetDateTime.now());
            learning.enroll(o.getUser(), o.getCourse());
        }
        orders.save(o);
    }

    private static String str(Object o) {
        return o == null ? null : String.valueOf(o);
    }

    private static BigDecimal parseAmount(Object o) {
        try {
            return o == null ? null : new BigDecimal(String.valueOf(o));
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
