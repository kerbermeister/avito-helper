package com.avitohelper.service;

import com.avitohelper.domain.Listing;
import com.avitohelper.domain.ListingStatus;
import com.avitohelper.domain.Photo;
import com.avitohelper.dto.CreateListingRequest;
import com.avitohelper.dto.ListingResponse;
import com.avitohelper.dto.ListingSummaryResponse;
import com.avitohelper.dto.PhotoResponse;
import com.avitohelper.dto.UpdateListingRequest;
import com.avitohelper.exception.NotFoundException;
import com.avitohelper.repository.ListingRepository;
import com.avitohelper.repository.PhotoRepository;
import com.avitohelper.storage.StorageService;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ListingService {

    private static final int MAX_PHOTOS = 12;

    private final ListingRepository listingRepository;
    private final PhotoRepository photoRepository;
    private final StorageService storageService;

    public ListingService(ListingRepository listingRepository,
                          PhotoRepository photoRepository,
                          StorageService storageService) {
        this.listingRepository = listingRepository;
        this.photoRepository = photoRepository;
        this.storageService = storageService;
    }

    @Transactional(readOnly = true)
    public List<ListingSummaryResponse> list(Long userId) {
        return listingRepository.findByUserIdOrderByUpdatedAtDesc(userId).stream()
                .map(this::toSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public ListingResponse get(Long userId, Long id) {
        Listing listing = getOwned(userId, id);
        return toResponse(listing);
    }

    @Transactional
    public ListingResponse create(Long userId, CreateListingRequest request) {
        Listing listing = new Listing();
        listing.setUserId(userId);
        apply(listing, request);
        listing.setStatus(ListingStatus.DRAFT);
        return toResponse(listingRepository.save(listing));
    }

    @Transactional
    public ListingResponse update(Long userId, Long id, UpdateListingRequest request) {
        Listing listing = getOwned(userId, id);
        apply(listing, request);
        return toResponse(listingRepository.save(listing));
    }

    @Transactional
    public ListingResponse updateStatus(Long userId, Long id, ListingStatus status) {
        Listing listing = getOwned(userId, id);
        listing.setStatus(status);
        if (status == ListingStatus.PUBLISHED && listing.getPublishedAt() == null) {
            listing.setPublishedAt(Instant.now());
        }
        return toResponse(listingRepository.save(listing));
    }

    @Transactional
    public void delete(Long userId, Long id) {
        Listing listing = getOwned(userId, id);
        for (Photo photo : listing.getPhotos()) {
            storageService.delete(photo.getStorageKey());
        }
        listingRepository.delete(listing);
    }

    // --- Photos ---

    @Transactional
    public PhotoResponse addPhoto(Long userId, Long listingId, MultipartFile file) throws IOException {
        Listing listing = getOwned(userId, listingId);
        int currentCount = (int) photoRepository.countByListingId(listingId);
        if (currentCount >= MAX_PHOTOS) {
            throw new IllegalArgumentException("Нельзя загрузить больше " + MAX_PHOTOS + " фото");
        }

        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "photo";
        String contentType = file.getContentType() != null ? file.getContentType() : "application/octet-stream";
        String key = "listings/" + listingId + "/" + UUID.randomUUID() + "-" + filename;

        storageService.put(key, file.getInputStream(), file.getSize(), contentType);

        Photo photo = new Photo();
        photo.setListing(listing);
        photo.setStorageKey(key);
        photo.setFileName(filename);
        photo.setMimeType(contentType);
        photo.setSizeBytes(file.getSize());
        photo.setSortOrder(currentCount + 1);

        return toPhotoResponse(listingId, photoRepository.save(photo));
    }

    @Transactional
    public void deletePhoto(Long userId, Long listingId, Long photoId) {
        Listing listing = getOwned(userId, listingId);
        Photo photo = listing.getPhotos().stream()
                .filter(p -> p.getId().equals(photoId))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Фото не найдено"));
        storageService.delete(photo.getStorageKey());
        // orphanRemoval=true удалит фото из БД после удаления из коллекции
        listing.getPhotos().remove(photo);
    }

    @Transactional(readOnly = true)
    public PhotoStream getPhotoStream(Long userId, Long listingId, Long photoId) {
        Listing listing = getOwned(userId, listingId);
        Photo photo = photoRepository.findById(photoId)
                .filter(p -> p.getListing().getId().equals(listingId))
                .orElseThrow(() -> new NotFoundException("Фото не найдено"));
        InputStream in = storageService.get(photo.getStorageKey());
        String contentType = photo.getMimeType() != null ? photo.getMimeType() : "image/jpeg";
        return new PhotoStream(in, contentType, photo.getFileName());
    }

    @Transactional(readOnly = true)
    public void writePhotosZip(Long userId, Long listingId, OutputStream out) throws IOException {
        Listing listing = getOwned(userId, listingId);
        try (ZipOutputStream zip = new ZipOutputStream(out)) {
            int index = 1;
            for (Photo photo : listing.getPhotos()) {
                String name = photo.getFileName() != null && !photo.getFileName().isBlank()
                        ? photo.getFileName()
                        : "photo-" + index;
                zip.putNextEntry(new ZipEntry(index + "_" + name));
                try (InputStream in = storageService.get(photo.getStorageKey())) {
                    in.transferTo(zip);
                }
                zip.closeEntry();
                index++;
            }
        }
    }

    // --- Helpers ---

    private Listing getOwned(Long userId, Long id) {
        Listing listing = listingRepository.findByIdWithPhotos(id)
                .orElseThrow(() -> new NotFoundException("Объявление не найдено"));
        if (!listing.getUserId().equals(userId)) {
            throw new NotFoundException("Объявление не найдено");
        }
        return listing;
    }

    private void apply(Listing listing, CreateListingRequest request) {
        listing.setTitle(request.title());
        listing.setDescription(request.description());
        listing.setPriceKopecks(request.priceKopecks());
        listing.setCategory(request.category());
    }

    private void apply(Listing listing, UpdateListingRequest request) {
        listing.setTitle(request.title());
        listing.setDescription(request.description());
        listing.setPriceKopecks(request.priceKopecks());
        listing.setCategory(request.category());
    }

    private ListingSummaryResponse toSummary(Listing listing) {
        // N+1 допустимо для персонального инструмента с малым объёмом данных.
        List<Photo> photos = photoRepository.findByListingIdOrderBySortOrderAsc(listing.getId());
        Long coverPhotoId = photos.isEmpty() ? null : photos.get(0).getId();
        List<Long> photoIds = photos.stream().map(Photo::getId).toList();
        return new ListingSummaryResponse(
                listing.getId(),
                listing.getTitle(),
                listing.getPriceKopecks(),
                listing.getCurrency(),
                listing.getCategory(),
                listing.getStatus(),
                listing.getCreatedAt(),
                listing.getUpdatedAt(),
                coverPhotoId,
                photos.size(),
                photoIds
        );
    }

    private ListingResponse toResponse(Listing listing) {
        Long coverPhotoId = listing.getPhotos().isEmpty()
                ? null
                : listing.getPhotos().get(0).getId();
        List<PhotoResponse> photos = listing.getPhotos().stream()
                .map(p -> toPhotoResponse(listing.getId(), p))
                .toList();
        return new ListingResponse(
                listing.getId(),
                listing.getTitle(),
                listing.getDescription(),
                listing.getPriceKopecks(),
                listing.getCurrency(),
                listing.getCategory(),
                listing.getStatus(),
                listing.getCreatedAt(),
                listing.getUpdatedAt(),
                listing.getPublishedAt(),
                coverPhotoId,
                photos
        );
    }

    private PhotoResponse toPhotoResponse(Long listingId, Photo photo) {
        return new PhotoResponse(
                photo.getId(),
                photo.getFileName(),
                photo.getMimeType(),
                photo.getSizeBytes(),
                photo.getSortOrder(),
                photo.getCreatedAt(),
                "/api/listings/" + listingId + "/photos/" + photo.getId()
        );
    }
}
