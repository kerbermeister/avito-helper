package com.avitohelper.rest;

import com.avitohelper.dto.PhotoResponse;
import com.avitohelper.service.CurrentUserService;
import com.avitohelper.service.ListingService;
import com.avitohelper.service.PhotoStream;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.InputStream;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/listings/{listingId}/photos")
public class PhotoController {

    private final ListingService listingService;
    private final CurrentUserService currentUserService;

    public PhotoController(ListingService listingService, CurrentUserService currentUserService) {
        this.listingService = listingService;
        this.currentUserService = currentUserService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public PhotoResponse addPhoto(@AuthenticationPrincipal UserDetails principal,
                                  @PathVariable Long listingId,
                                  @RequestParam("file") MultipartFile file) throws IOException {
        return listingService.addPhoto(currentUserService.idOf(principal.getUsername()), listingId, file);
    }

    @GetMapping("/{photoId}")
    public void servePhoto(@AuthenticationPrincipal UserDetails principal,
                           @PathVariable Long listingId,
                           @PathVariable Long photoId,
                           HttpServletResponse response) throws IOException {
        PhotoStream stream = listingService.getPhotoStream(
                currentUserService.idOf(principal.getUsername()), listingId, photoId);
        response.setContentType(stream.contentType());
        response.setHeader("Content-Disposition", "inline");
        try (InputStream in = stream.inputStream()) {
            in.transferTo(response.getOutputStream());
        }
    }

    @GetMapping("/{photoId}/thumb")
    public void serveThumb(@AuthenticationPrincipal UserDetails principal,
                           @PathVariable Long listingId,
                           @PathVariable Long photoId,
                           HttpServletResponse response) throws IOException {
        PhotoStream stream = listingService.getPhotoThumbStream(
                currentUserService.idOf(principal.getUsername()), listingId, photoId);
        response.setContentType(stream.contentType());
        response.setHeader("Content-Disposition", "inline");
        response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        try (InputStream in = stream.inputStream()) {
            in.transferTo(response.getOutputStream());
        }
    }

    @GetMapping("/archive")
    public void archive(@AuthenticationPrincipal UserDetails principal,
                        @PathVariable Long listingId,
                        HttpServletResponse response) throws IOException {
        response.setContentType("application/zip");
        response.setHeader("Content-Disposition",
                "attachment; filename=\"listing-" + listingId + "-photos.zip\"");
        listingService.writePhotosZip(
                currentUserService.idOf(principal.getUsername()), listingId, response.getOutputStream());
    }

    @DeleteMapping("/{photoId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePhoto(@AuthenticationPrincipal UserDetails principal,
                            @PathVariable Long listingId,
                            @PathVariable Long photoId) {
        listingService.deletePhoto(currentUserService.idOf(principal.getUsername()), listingId, photoId);
    }
}
