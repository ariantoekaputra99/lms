package com.lms.controller;

import com.lms.dto.PaymentDtos.CheckoutResponse;
import com.lms.dto.PaymentDtos.OrderResponse;
import com.lms.service.payment.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PaymentController {
    private final PaymentService payments;

    @PostMapping("/courses/{id}/checkout")
    public CheckoutResponse checkout(@PathVariable Long id) {
        return payments.checkout(id);
    }

    @GetMapping("/me/orders")
    public List<OrderResponse> myOrders() {
        return payments.myOrders();
    }

    @GetMapping("/orders/{code}")
    public OrderResponse order(@PathVariable String code) {
        return payments.myOrder(code);
    }

    @PostMapping("/orders/{code}/simulate")
    public OrderResponse simulate(@PathVariable String code, @RequestParam(defaultValue = "true") boolean pay) {
        return payments.simulate(code, pay);
    }

    /** Midtrans "Payment Notification URL": https://YOUR_DOMAIN/api/payments/midtrans/notification */
    @PostMapping("/payments/midtrans/notification")
    public ResponseEntity<Map<String, String>> midtransNotification(@RequestBody Map<String, Object> body) {
        payments.handleMidtransNotification(body);
        return ResponseEntity.ok(Map.of("status", "ok"));
    }
}
