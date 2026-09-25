package com.avitohelper.service;

import com.avitohelper.config.AppProperties;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import net.coobird.thumbnailator.Thumbnails;
import org.springframework.stereotype.Service;

/**
 * Сжатие изображений и генерация миниатюр.
 * Если изображение не удаётся обработать (неизвестный формат и т.п.),
 * возвращает исходные байты без изменений — загрузка не падает.
 */
@Service
public class ImageService {

    private final int maxDimension;
    private final float quality;
    private final int thumbDimension;

    public ImageService(AppProperties props) {
        this.maxDimension = props.image().maxDimension();
        this.quality = props.image().quality();
        this.thumbDimension = props.image().thumbDimension();
    }

    public byte[] compress(byte[] input) {
        try {
            return resize(input, maxDimension, quality);
        } catch (Exception e) {
            return input;
        }
    }

    public byte[] thumbnail(byte[] input) {
        try {
            return resize(input, thumbDimension, quality);
        } catch (Exception e) {
            return input;
        }
    }

    private byte[] resize(byte[] input, int maxDim, float q) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Thumbnails.of(new ByteArrayInputStream(input))
                .size(maxDim, maxDim)
                .outputFormat("jpg")
                .outputQuality(q)
                .toOutputStream(out);
        return out.toByteArray();
    }
}
