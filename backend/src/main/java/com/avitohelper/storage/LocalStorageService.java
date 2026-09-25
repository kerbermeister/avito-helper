package com.avitohelper.storage;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Хранилище в локальной файловой системе. Подходит для MVP и деплоя на один VPS
 * (каталог монтируется как Docker-том).
 */
public class LocalStorageService implements StorageService {

    private final Path baseDir;

    public LocalStorageService(String baseDir) {
        this.baseDir = Paths.get(baseDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.baseDir);
        } catch (IOException e) {
            throw new IllegalStateException("Не удалось создать каталог хранилища: " + this.baseDir, e);
        }
    }

    @Override
    public void put(String key, InputStream data, long size, String contentType) {
        try {
            Path target = resolve(key);
            Files.createDirectories(target.getParent());
            try (InputStream in = data; OutputStream out = Files.newOutputStream(target)) {
                in.transferTo(out);
            }
        } catch (IOException e) {
            throw new IllegalStateException("Не удалось записать файл: " + key, e);
        }
    }

    @Override
    public InputStream get(String key) {
        try {
            return Files.newInputStream(resolve(key));
        } catch (IOException e) {
            throw new IllegalStateException("Не удалось прочитать файл: " + key, e);
        }
    }

    @Override
    public void delete(String key) {
        try {
            Files.deleteIfExists(resolve(key));
        } catch (IOException e) {
            throw new IllegalStateException("Не удалось удалить файл: " + key, e);
        }
    }

    @Override
    public boolean exists(String key) {
        return Files.exists(resolve(key));
    }

    private Path resolve(String key) {
        Path resolved = baseDir.resolve(key).normalize();
        if (!resolved.startsWith(baseDir)) {
            throw new IllegalArgumentException("Некорректный ключ файла: " + key);
        }
        return resolved;
    }
}
