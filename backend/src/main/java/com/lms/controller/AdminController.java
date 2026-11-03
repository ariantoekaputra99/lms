package com.lms.controller;

import com.lms.dto.AuthDtos.AdminUserUpdate;
import com.lms.dto.AuthDtos.UserResponse;
import com.lms.dto.CourseDtos.CategoryRequest;
import com.lms.dto.CourseDtos.CategoryResponse;
import com.lms.dto.PaymentDtos.AdminStats;
import com.lms.dto.PaymentDtos.OrderResponse;
import com.lms.service.CategoryService;
import com.lms.service.StatsService;
import com.lms.service.UserAdminService;
import com.lms.service.payment.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
    private final StatsService stats;
    private final UserAdminService users;
    private final CategoryService categories;
    private final PaymentService payments;

    @GetMapping("/stats")
    public AdminStats stats() {
        return stats.admin();
    }

    @GetMapping("/users")
    public List<UserResponse> users() {
        return users.list();
    }

    @PutMapping("/users/{id}")
    public UserResponse updateUser(@PathVariable Long id, @Valid @RequestBody AdminUserUpdate request) {
        return users.update(id, request);
    }

    @GetMapping("/orders")
    public List<OrderResponse> orders() {
        return payments.allOrders();
    }

    @PostMapping("/categories")
    public ResponseEntity<CategoryResponse> createCategory(@Valid @RequestBody CategoryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(categories.create(request));
    }

    @PutMapping("/categories/{id}")
    public CategoryResponse updateCategory(@PathVariable Long id, @Valid @RequestBody CategoryRequest request) {
        return categories.update(id, request);
    }

    @DeleteMapping("/categories/{id}")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long id) {
        categories.delete(id);
        return ResponseEntity.noContent().build();
    }
}
