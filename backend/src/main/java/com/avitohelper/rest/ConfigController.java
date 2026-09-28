package com.avitohelper.rest;

import com.avitohelper.config.AppProperties;
import com.avitohelper.dto.AppConfigResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Публичные настройки приложения для фронтенда.
 */
@RestController
@RequestMapping("/api/config")
public class ConfigController {

    private final AppProperties props;

    public ConfigController(AppProperties props) {
        this.props = props;
    }

    @GetMapping
    public AppConfigResponse get() {
        return new AppConfigResponse(
                props.voice().maxRecordingSeconds(),
                props.voice().minSpeechLevel());
    }
}
