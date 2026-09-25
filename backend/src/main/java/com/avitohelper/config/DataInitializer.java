package com.avitohelper.config;

import com.avitohelper.domain.User;
import com.avitohelper.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner initUsers(UserRepository userRepository,
                                PasswordEncoder passwordEncoder,
                                AppProperties props) {
        return args -> {
            if (userRepository.count() == 0) {
                User user = new User();
                user.setEmail(props.admin().email());
                user.setPasswordHash(passwordEncoder.encode(props.admin().password()));
                userRepository.save(user);
            }
        };
    }
}
