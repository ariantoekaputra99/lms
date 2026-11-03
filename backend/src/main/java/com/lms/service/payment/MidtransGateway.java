package com.lms.service.payment;

import com.lms.entity.Order;
import com.lms.exception.BusinessException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/** Midtrans Snap (hosted payment page) + Core API status check. */
@Slf4j
public class MidtransGateway implements PaymentGateway {
    private final String serverKey;
    private final String snapUrl;
    private final String apiUrl;
    private final String finishUrl;
    private final RestClient http;

    public MidtransGateway(String serverKey, boolean production, String frontendUrl) {
        this.serverKey = serverKey;
        this.snapUrl = production ? "https://app.midtrans.com/snap/v1/transactions" : "https://app.sandbox.midtrans.com/snap/v1/transactions";
        this.apiUrl = production ? "https://api.midtrans.com/v2" : "https://api.sandbox.midtrans.com/v2";
        this.finishUrl = frontendUrl.replaceAll("/+$", "") + "/checkout/finish";
        String auth = Base64.getEncoder().encodeToString((serverKey + ":").getBytes(StandardCharsets.UTF_8));
        this.http = RestClient.builder()
            .defaultHeader(HttpHeaders.AUTHORIZATION, "Basic " + auth)
            .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
            .build();
    }

    @Override
    public String name() {
        return "MIDTRANS";
    }

    @Override
    public Checkout createCheckout(Order order) {
        long gross = order.getAmount().longValueExact();
        Map<String, Object> body = Map.of(
            "transaction_details", Map.of("order_id", order.getOrderCode(), "gross_amount", gross),
            "item_details", List.of(Map.of("id", "COURSE-" + order.getCourse().getId(), "price", gross, "quantity", 1,
                "name", truncate(order.getCourse().getTitle(), 50))),
            "customer_details", Map.of("first_name", truncate(order.getUser().getFullName(), 50), "email", order.getUser().getEmail()),
            "callbacks", Map.of("finish", finishUrl));
        try {
            Map<String, Object> res = http.post().uri(snapUrl).contentType(MediaType.APPLICATION_JSON).body(body)
                .retrieve().body(new ParameterizedTypeReference<>() {});
            if (res == null || res.get("token") == null) throw new BusinessException("Gagal membuat pembayaran Midtrans");
            return new Checkout(String.valueOf(res.get("token")), String.valueOf(res.get("redirect_url")));
        } catch (RestClientException e) {
            log.error("Midtrans Snap request failed", e);
            throw new BusinessException("Layanan pembayaran sedang tidak tersedia, coba lagi nanti");
        }
    }

    @Override
    public Optional<Map<String, Object>> fetchStatus(String orderCode) {
        try {
            Map<String, Object> res = http.get().uri(apiUrl + "/{id}/status", orderCode).retrieve()
                .body(new ParameterizedTypeReference<>() {});
            return Optional.ofNullable(res);
        } catch (RestClientException e) {
            log.warn("Midtrans status check failed for {}: {}", orderCode, e.getMessage());
            return Optional.empty();
        }
    }

    /** signature_key = SHA512(order_id + status_code + gross_amount + server_key) */
    public boolean validSignature(String orderId, String statusCode, String grossAmount, String signature) {
        if (orderId == null || statusCode == null || grossAmount == null || signature == null) return false;
        String expected = sha512(orderId + statusCode + grossAmount + serverKey);
        return MessageDigest.isEqual(expected.getBytes(StandardCharsets.US_ASCII), signature.toLowerCase().getBytes(StandardCharsets.US_ASCII));
    }

    static String sha512(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-512").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String truncate(String s, int max) {
        return s == null ? "" : s.length() <= max ? s : s.substring(0, max);
    }
}
