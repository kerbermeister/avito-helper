package com.avitohelper.storage;

import java.io.InputStream;

public interface StorageService {

    void put(String key, InputStream data, long size, String contentType);

    InputStream get(String key);

    void delete(String key);

    boolean exists(String key);
}
