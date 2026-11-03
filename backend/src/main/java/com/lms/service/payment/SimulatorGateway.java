package com.lms.service.payment;

import com.lms.entity.Order;

import java.util.Map;
import java.util.Optional;

/**
 * Development-only gateway: "pays" through a page in the frontend. Enabled only when no Midtrans
 * server key is configured and app.payment.simulator-enabled=true (disable it in production).
 */
public class SimulatorGateway implements PaymentGateway {
    private final String frontendUrl;

    public SimulatorGateway(String frontendUrl) {
        this.frontendUrl = frontendUrl.replaceAll("/+$", "");
    }

    @Override
    public String name() {
        return "SIMULATOR";
    }

    @Override
    public Checkout createCheckout(Order order) {
        return new Checkout(null, frontendUrl + "/checkout/simulate/" + order.getOrderCode());
    }

    @Override
    public Optional<Map<String, Object>> fetchStatus(String orderCode) {
        return Optional.empty();
    }
}
