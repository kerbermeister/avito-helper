package com.avitohelper.repository;

import com.avitohelper.domain.Listing;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ListingRepository extends JpaRepository<Listing, Long> {

    List<Listing> findByUserIdOrderByUpdatedAtDesc(Long userId);

    List<Listing> findByUserIdAndStatus(Long userId, com.avitohelper.domain.ListingStatus status);

    @Query("select l from Listing l left join fetch l.photos where l.id = :id")
    Optional<Listing> findByIdWithPhotos(@Param("id") Long id);

    @Query("select l from Listing l left join fetch l.photos where l.userId = :userId and l.status = :status order by l.updatedAt desc")
    List<Listing> findByUserIdAndStatusWithPhotos(@Param("userId") Long userId, @Param("status") com.avitohelper.domain.ListingStatus status);
}
