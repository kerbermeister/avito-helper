package com.avitohelper.service;

import java.io.InputStream;

public record PhotoStream(InputStream inputStream, String contentType, String filename) {
}
