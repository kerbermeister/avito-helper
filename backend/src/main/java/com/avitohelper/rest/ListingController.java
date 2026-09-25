package com.avitohelper.rest;

import com.avitohelper.dto.CreateListingRequest;
import com.avitohelper.dto.ListingResponse;
import com.avitohelper.dto.ListingSummaryResponse;
import com.avitohelper.dto.StatusUpdateRequest;
import com.avitohelper.dto.UpdateListingRequest;
import com.avitohelper.service.CurrentUserService;
import com.avitohelper.service.ListingService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/listings")
public class ListingController {

    private final ListingService listingService;
    private final CurrentUserService currentUserService;

    public ListingController(ListingService listingService, CurrentUserService currentUserService) {
        this.listingService = listingService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public List<ListingSummaryResponse> list(@AuthenticationPrincipal UserDetails principal) {
        return listingService.list(currentUserService.idOf(principal.getUsername()));
    }

    @GetMapping("/{id}")
    public ListingResponse get(@AuthenticationPrincipal UserDetails principal, @PathVariable Long id) {
        return listingService.get(currentUserService.idOf(principal.getUsername()), id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ListingResponse create(@AuthenticationPrincipal UserDetails principal,
                                  @Valid @RequestBody CreateListingRequest request) {
        return listingService.create(currentUserService.idOf(principal.getUsername()), request);
    }

    @PutMapping("/{id}")
    public ListingResponse update(@AuthenticationPrincipal UserDetails principal,
                                  @PathVariable Long id,
                                  @Valid @RequestBody UpdateListingRequest request) {
        return listingService.update(currentUserService.idOf(principal.getUsername()), id, request);
    }

    @PatchMapping("/{id}/status")
    public ListingResponse updateStatus(@AuthenticationPrincipal UserDetails principal,
                                        @PathVariable Long id,
                                        @Valid @RequestBody StatusUpdateRequest request) {
        return listingService.updateStatus(currentUserService.idOf(principal.getUsername()), id, request.status());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal UserDetails principal, @PathVariable Long id) {
        listingService.delete(currentUserService.idOf(principal.getUsername()), id);
    }
}
