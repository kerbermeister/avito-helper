package com.avitohelper.service;

import com.avitohelper.exception.NotFoundException;
import com.avitohelper.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserService {

    private final UserRepository userRepository;

    public CurrentUserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public Long idOf(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("User not found: " + email))
                .getId();
    }
}
