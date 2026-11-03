package com.lms.service.payment;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class MidtransPaymentTest {
    private final MidtransGateway gateway = new MidtransGateway("SB-Mid-server-TEST", false, "http://localhost:5173");

    @Test
    void acceptsValidSignatureAndRejectsTampering() {
        String sig = MidtransGateway.sha512("ORD-1" + "200" + "150000.00" + "SB-Mid-server-TEST");
        assertThat(gateway.validSignature("ORD-1", "200", "150000.00", sig)).isTrue();
        assertThat(gateway.validSignature("ORD-1", "200", "150000.00", sig.toUpperCase())).isTrue();
        assertThat(gateway.validSignature("ORD-1", "200", "1.00", sig)).isFalse();
        assertThat(gateway.validSignature("ORD-2", "200", "150000.00", sig)).isFalse();
        assertThat(gateway.validSignature("ORD-1", "200", "150000.00", null)).isFalse();
    }

    @Test
    void sha512MatchesKnownVector() {
        assertThat(MidtransGateway.sha512("abc")).startsWith("ddaf35a193617aba");
    }
}
