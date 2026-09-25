# Сборка: Maven + JDK 25 (контекст сборки — корень репозитория)
FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /workspace
COPY pom.xml ./
COPY backend/pom.xml backend/pom.xml
COPY backend/src backend/src
RUN mvn -B -q -DskipTests package

# Запуск
FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=build /workspace/backend/target/avito-helper-backend-*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
