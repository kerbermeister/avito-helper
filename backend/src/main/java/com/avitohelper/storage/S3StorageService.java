package com.avitohelper.storage;

import com.avitohelper.config.AppProperties;
import jakarta.annotation.PostConstruct;
import java.io.InputStream;
import java.net.URI;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchBucketException;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

/**
 * Реализация хранилища поверх S3-совместимого API
 * (Cloudflare R2 / AWS S3 / Yandex Object Storage / Garage / SeaweedFS).
 */
public class S3StorageService implements StorageService {

    private final S3Client s3Client;
    private final String bucket;

    public S3StorageService(AppProperties props) {
        this.bucket = props.s3().bucket();
        this.s3Client = S3Client.builder()
                .endpointOverride(URI.create(props.s3().endpoint()))
                .region(Region.of(props.s3().region()))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(props.s3().accessKey(), props.s3().secretKey())))
                .forcePathStyle(true)
                .build();
    }

    @PostConstruct
    void ensureBucket() {
        int maxAttempts = 30;
        SdkClientException last = null;
        for (int i = 1; i <= maxAttempts; i++) {
            try {
                s3Client.headBucket(HeadBucketRequest.builder().bucket(bucket).build());
                return;
            } catch (NoSuchBucketException e) {
                s3Client.createBucket(CreateBucketRequest.builder().bucket(bucket).build());
                return;
            } catch (SdkClientException e) {
                // Хранилище ещё не готово — ждём и пробуем снова.
                last = e;
                try {
                    Thread.sleep(2000L);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw last;
                }
            }
        }
        throw last;
    }

    @Override
    public void put(String key, InputStream data, long size, String contentType) {
        s3Client.putObject(PutObjectRequest.builder()
                        .bucket(bucket)
                        .key(key)
                        .contentType(contentType)
                        .contentLength(size)
                        .build(),
                RequestBody.fromInputStream(data, size));
    }

    @Override
    public InputStream get(String key) {
        return s3Client.getObject(GetObjectRequest.builder().bucket(bucket).key(key).build());
    }

    @Override
    public void delete(String key) {
        s3Client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
    }

    @Override
    public boolean exists(String key) {
        try {
            s3Client.headObject(HeadObjectRequest.builder().bucket(bucket).key(key).build());
            return true;
        } catch (NoSuchKeyException e) {
            return false;
        }
    }
}
