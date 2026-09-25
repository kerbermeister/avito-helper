package com.avitohelper.repository;

import com.avitohelper.domain.Photo;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PhotoRepository extends JpaRepository<Photo, Long> {

    List<Photo> findByListingIdOrderBySortOrderAsc(Long listingId);

    Optional<Photo> findFirstByListingIdOrderBySortOrderAsc(Long listingId);

    long countByListingId(Long listingId);
}
