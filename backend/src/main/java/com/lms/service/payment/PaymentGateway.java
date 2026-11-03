package com.lms.service.payment;

import com.lms.entity.Order;

import java.util.Map;
import java.util.Optional;

public interface PaymentGateway {
    String name();

    record Checkout(String token, String redirectUrl) {}

    /** Creates a hosted payment page for the order. */
    Checkout createCheckout(Order order);

    /** Authoritative transaction status from the provider (raw provider fields), if supported. */
    Optional<Map<String, Object>> fetchStatus(String orderCode);
}
