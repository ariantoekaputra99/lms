package com.lms.service;

import com.lms.dto.AuthDtos.AdminUserUpdate;
import com.lms.dto.AuthDtos.UserResponse;
import com.lms.entity.Role;
import com.lms.entity.User;
import com.lms.exception.BusinessException;
import com.lms.exception.NotFoundException;
import com.lms.repository.UserRepository;
import com.lms.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserAdminService {
    private final UserRepository users;
    private final CurrentUser currentUser;

    public List<UserResponse> list() {
        return users.findAllByOrderByCreatedAtDesc().stream().map(UserResponse::from).toList();
    }

    @Transactional
    public UserResponse update(Long id, AdminUserUpdate request) {
        User user = users.findById(id).orElseThrow(() -> NotFoundException.of("Pengguna", id));
        if (user.getId().equals(currentUser.get().getId())) {
            throw new BusinessException("Tidak bisa mengubah role/status akun sendiri");
        }
        boolean removesAdmin = user.getRole() == Role.ADMIN && (request.role() != Role.ADMIN || !request.active());
        if (removesAdmin && users.findAll().stream()
            .noneMatch(u -> !u.getId().equals(id) && u.getRole() == Role.ADMIN && u.isActive())) {
            throw new BusinessException("Harus ada minimal satu admin aktif");
        }
        user.setRole(request.role());
        user.setActive(request.active());
        return UserResponse.from(users.save(user));
    }
}
