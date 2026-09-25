package com.avitohelper.config;

import com.avitohelper.storage.LocalStorageService;
import com.avitohelper.storage.S3StorageService;
import com.avitohelper.storage.StorageService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Выбор реализации хранилища по настройке app.storage.type (local | s3).
 */
@Configuration
public class StorageConfig {

    @Bean
    @ConditionalOnProperty(name = "app.storage.type", havingValue = "local", matchIfMissing = true)
    public StorageService localStorageService(AppProperties props) {
        return new LocalStorageService(props.storage().local().baseDir());
    }

    @Bean
    @ConditionalOnProperty(name = "app.storage.type", havingValue = "s3")
    public StorageService s3StorageService(AppProperties props) {
        return new S3StorageService(props);
    }
}
