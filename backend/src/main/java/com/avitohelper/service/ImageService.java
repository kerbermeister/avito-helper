package com.avitohelper.service;

import com.avitohelper.config.AppProperties;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import javax.imageio.ImageIO;
import net.coobird.thumbnailator.Thumbnails;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Сжатие изображений и генерация миниатюр.
 * Если изображение не удаётся обработать (неизвестный формат и т.п.),
 * возвращает исходные байты без изменений — загрузка не падает.
 */
@Service
public class ImageService {

    private static final Logger log = LoggerFactory.getLogger(ImageService.class);

    private final int maxDimension;
    private final float quality;
    private final int thumbDimension;

    public ImageService(AppProperties props) {
        this.maxDimension = props.image().maxDimension();
        this.quality = props.image().quality();
        this.thumbDimension = props.image().thumbDimension();
    }

    /**
     * Готовит оригинал к хранению. Если клиент уже прислал оптимизированный JPEG
     * в пределах лимита — принимаем как есть (без повторного ре-энкода), иначе сжимаем.
     */
    public byte[] prepare(byte[] input) {
        return isReadyJpeg(input) ? input : compress(input);
    }

    public byte[] compress(byte[] input) {
        try {
            return resize(input, maxDimension, quality);
        } catch (Exception e) {
            log.warn("Не удалось сжать изображение: {}", e.getMessage());
            return input;
        }
    }

    public byte[] thumbnail(byte[] input) {
        try {
            return resize(input, thumbDimension, quality);
        } catch (Exception e) {
            log.warn("Не удалось создать миниатюру: {}", e.getMessage());
            return input;
        }
    }

    public byte[] rotate90(byte[] input) {
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            Thumbnails.of(new ByteArrayInputStream(input))
                    .useExifOrientation(true)
                    .scale(1.0)
                    .rotate(90)
                    .outputFormat("jpg")
                    .outputQuality(quality)
                    .toOutputStream(out);
            return out.toByteArray();
        } catch (Exception e) {
            log.warn("Не удалось повернуть изображение: {}", e.getMessage());
            return input;
        }
    }

    /** Уже JPEG и не превышает лимит по большей стороне. */
    private boolean isReadyJpeg(byte[] input) {
        if (input == null || input.length < 3) {
            return false;
        }
        if ((input[0] & 0xFF) != 0xFF || (input[1] & 0xFF) != 0xD8 || (input[2] & 0xFF) != 0xFF) {
            return false;
        }
        try {
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(input));
            if (image == null) {
                return false;
            }
            return Math.max(image.getWidth(), image.getHeight()) <= maxDimension;
        } catch (IOException e) {
            return false;
        }
    }

    private byte[] resize(byte[] input, int maxDim, float q) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Thumbnails.of(new ByteArrayInputStream(input))
                .useExifOrientation(true)
                .size(maxDim, maxDim)
                .outputFormat("jpg")
                .outputQuality(q)
                .toOutputStream(out);
        return out.toByteArray();
    }
}
