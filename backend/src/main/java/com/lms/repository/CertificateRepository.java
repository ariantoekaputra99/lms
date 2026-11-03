package com.lms.repository;

import com.lms.entity.Certificate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CertificateRepository extends JpaRepository<Certificate, Long> {
    Optional<Certificate> findByCode(String code);
    Optional<Certificate> findByEnrollmentId(Long enrollmentId);

    @Query("select c from Certificate c where c.enrollment.user.id = :userId order by c.issuedAt desc")
    List<Certificate> findByUserId(@Param("userId") Long userId);
}
