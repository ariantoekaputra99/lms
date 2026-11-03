package com.lms.service;

import com.lms.dto.CourseDtos.CategoryRequest;
import com.lms.dto.CourseDtos.CategoryResponse;
import com.lms.entity.Category;
import com.lms.exception.BusinessException;
import com.lms.exception.NotFoundException;
import com.lms.repository.CategoryRepository;
import com.lms.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {
    private final CategoryRepository categories;
    private final CourseRepository courses;

    public List<CategoryResponse> list() {
        return categories.findAllByOrderByNameAsc().stream()
            .map(c -> new CategoryResponse(c.getId(), c.getName(), c.getSlug(), courses.countByCategoryId(c.getId())))
            .toList();
    }

    @Transactional
    public CategoryResponse create(CategoryRequest request) {
        String name = request.name().trim();
        if (categories.existsByNameIgnoreCase(name)) throw new BusinessException("Kategori sudah ada");
        Category c = categories.save(Category.builder().name(name)
            .slug(Slugs.unique(name, s -> categories.findBySlug(s).isPresent())).build());
        return new CategoryResponse(c.getId(), c.getName(), c.getSlug(), 0);
    }

    @Transactional
    public CategoryResponse update(Long id, CategoryRequest request) {
        Category c = categories.findById(id).orElseThrow(() -> NotFoundException.of("Kategori", id));
        String name = request.name().trim();
        if (!c.getName().equalsIgnoreCase(name) && categories.existsByNameIgnoreCase(name)) {
            throw new BusinessException("Kategori sudah ada");
        }
        c.setName(name);
        categories.save(c);
        return new CategoryResponse(c.getId(), c.getName(), c.getSlug(), courses.countByCategoryId(id));
    }

    @Transactional
    public void delete(Long id) {
        Category c = categories.findById(id).orElseThrow(() -> NotFoundException.of("Kategori", id));
        if (courses.countByCategoryId(id) > 0) throw new BusinessException("Kategori masih dipakai oleh kursus");
        categories.delete(c);
    }
}
