package com.lms.service;

import com.lms.dto.PaymentDtos.AdminStats;
import com.lms.dto.PaymentDtos.InstructorStats;
import com.lms.dto.PaymentDtos.OrderResponse;
import com.lms.entity.CourseStatus;
import com.lms.entity.Role;
import com.lms.entity.SubmissionStatus;
import com.lms.entity.User;
import com.lms.repository.*;
import com.lms.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class StatsService {
    private final UserRepository users;
    private final CourseRepository courses;
    private final EnrollmentRepository enrollments;
    private final OrderRepository orders;
    private final AssignmentSubmissionRepository submissions;
    private final CurrentUser currentUser;

    @Transactional(readOnly = true)
    public AdminStats admin() {
        return new AdminStats(users.count(), users.countByRole(Role.STUDENT), users.countByRole(Role.INSTRUCTOR),
            courses.count(), courses.countByStatus(CourseStatus.PUBLISHED), enrollments.count(), orders.totalPaid(),
            orders.findAllByOrderByCreatedAtDesc().stream().limit(8).map(OrderResponse::from).toList());
    }

    @Transactional(readOnly = true)
    public InstructorStats instructor() {
        User u = currentUser.get();
        var mine = courses.findByInstructorIdOrderByUpdatedAtDesc(u.getId());
        long published = mine.stream().filter(c -> c.getStatus() == CourseStatus.PUBLISHED).count();
        long pending = submissions.findForInstructor(u.getId()).stream()
            .filter(s -> s.getStatus() == SubmissionStatus.SUBMITTED).count();
        return new InstructorStats(mine.size(), published, enrollments.countByInstructorId(u.getId()),
            orders.totalPaidForInstructor(u.getId()), pending);
    }
}
