package com.avitohelper.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Внешние настройки приложения (префикс "app" в application.yml).
 */
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        Admin admin,
        Jwt jwt,
        Storage storage,
        S3 s3,
        Stt stt
) {

    public record Admin(String email, String password) {
    }

    public record Jwt(String secret, long accessTtlSeconds) {
    }

    public record Storage(String type, Local local) {
    }

    public record Local(String baseDir) {
    }

    public record S3(String endpoint, String region, String accessKey, String secretKey, String bucket) {
    }

    public record Stt(String url) {
    }
}
