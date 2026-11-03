package com.lms.dto;

import com.lms.entity.Order;
import com.lms.entity.OrderStatus;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public final class PaymentDtos {
    private PaymentDtos() {}

    /** enrolled=true means no payment was needed (free course or already owned). */
    public record CheckoutResponse(boolean enrolled, String orderCode, OrderStatus status, String provider,
                                   String redirectUrl, String snapToken) {}

    public record OrderResponse(Long id, String orderCode, Long courseId, String courseTitle, String courseSlug,
                                String studentName, String studentEmail, BigDecimal amount, OrderStatus status,
                                String provider, String paymentType, String redirectUrl, OffsetDateTime createdAt,
                                OffsetDateTime paidAt) {
        public static OrderResponse from(Order o) {
            return new OrderResponse(o.getId(), o.getOrderCode(), o.getCourse().getId(), o.getCourse().getTitle(),
                o.getCourse().getSlug(), o.getUser().getFullName(), o.getUser().getEmail(), o.getAmount(), o.getStatus(),
                o.getProvider(), o.getPaymentType(), o.getRedirectUrl(), o.getCreatedAt(), o.getPaidAt());
        }
    }

    public record AdminStats(long users, long students, long instructors, long courses, long publishedCourses,
                             long enrollments, BigDecimal revenue, List<OrderResponse> recentOrders) {}

    public record InstructorStats(long courses, long publishedCourses, long students, BigDecimal revenue,
                                  long pendingSubmissions) {}
}
