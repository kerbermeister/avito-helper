package com.avitohelper.rest;

import com.avitohelper.dto.ListingParseResponse;
import com.avitohelper.dto.StructuredListing;
import com.avitohelper.service.GeminiService;
import com.avitohelper.service.TranscriptionService;
import java.io.IOException;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/listings/parse")
public class ListingParserController {

    private final TranscriptionService transcriptionService;
    private final GeminiService geminiService;

    public ListingParserController(TranscriptionService transcriptionService, GeminiService geminiService) {
        this.transcriptionService = transcriptionService;
        this.geminiService = geminiService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ListingParseResponse parse(@RequestParam("file") MultipartFile file) throws IOException {
        String rawText = transcriptionService.transcribe(file.getBytes(), file.getOriginalFilename());
        StructuredListing structured = geminiService.structure(rawText);
        return new ListingParseResponse(rawText, structured.title(), structured.description(), structured.category());
    }
}
