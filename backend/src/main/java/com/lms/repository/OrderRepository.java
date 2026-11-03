package com.lms.repository;

import com.lms.entity.Order;
import com.lms.entity.OrderStatus;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrderRepository extends JpaRepository<Order, Long> {
    Optional<Order> findByOrderCode(String orderCode);
    List<Order> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<Order> findAllByOrderByCreatedAtDesc();
    Optional<Order> findFirstByUserIdAndCourseIdAndStatusOrderByCreatedAtDesc(Long userId, Long courseId, OrderStatus status);

    @Query("select coalesce(sum(o.amount), 0) from Order o where o.status = com.lms.entity.OrderStatus.PAID")
    BigDecimal totalPaid();

    @Query("select coalesce(sum(o.amount), 0) from Order o where o.status = com.lms.entity.OrderStatus.PAID and o.course.instructor.id = :instructorId")
    BigDecimal totalPaidForInstructor(@Param("instructorId") Long instructorId);
}
