package com.avitohelper.rest;

import com.avitohelper.dto.StructureRequest;
import com.avitohelper.dto.StructuredListing;
import com.avitohelper.service.GeminiService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/listings/structure")
public class ListingStructurerController {

    private final GeminiService geminiService;

    public ListingStructurerController(GeminiService geminiService) {
        this.geminiService = geminiService;
    }

    @PostMapping
    public StructuredListing structure(@RequestBody StructureRequest request) {
        return geminiService.structure(request.text());
    }
}
