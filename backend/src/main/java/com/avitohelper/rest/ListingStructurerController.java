package com.avitohelper.rest;

import com.avitohelper.dto.StructureRequest;
import com.avitohelper.dto.StructuredListing;
import com.avitohelper.structuring.ListingStructuringService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/listings/structure")
public class ListingStructurerController {

    private final ListingStructuringService structuringService;

    public ListingStructurerController(ListingStructuringService structuringService) {
        this.structuringService = structuringService;
    }

    @PostMapping
    public StructuredListing structure(@RequestBody StructureRequest request) {
        return structuringService.structure(request.text());
    }
}
