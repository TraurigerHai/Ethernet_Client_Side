-- MySQL dump 10.13  Distrib 8.0.40, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: ethernet
-- ------------------------------------------------------
-- Server version	9.1.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `phone` varchar(20) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `password` varchar(100) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `address` varchar(200) NOT NULL,
  `tariff_id` int DEFAULT NULL,
  `balance` decimal(10,2) DEFAULT '0.00',
  `next_payment_date` date DEFAULT NULL,
  `autopay_enabled` tinyint(1) DEFAULT '0',
  `autopay_threshold` int DEFAULT '100',
  PRIMARY KEY (`id`),
  KEY `tariff_idx` (`tariff_id`),
  CONSTRAINT `tariff` FOREIGN KEY (`tariff_id`) REFERENCES `tariffplans` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'+7 (999)-123-45-66','Тестовый Пользователь','$2a$10$Vc8ECDgH6yR29xlrfBEllOsjbdweUupXuRkuhO7rVhaS5w/ri8ike','test@example.com','ул. Тестовая, д. 3',2,2850.00,'2025-07-01',1,500),(2,'+7 (999)-234-56-78','Иванов Иван Иванович','$2a$10$94drSsSVf01QpZ9U5GUNIusEZ//d5yP68GKI7BRTBDGrk7vxPm9DO','ivanov@example.com','ул. Ленина, д. 15, кв. 42',1,750.00,'2025-06-15',0,300),(3,'+7 (999)-345-67-89','Петрова Мария Сергеевна','$2a$2a$10$HohzpSrm/N7vCA7z6EjiXeA7D2D1.Gl9lCSioNJbkmNgMFVFSOLdG','petrova@example.com','пр. Мира, д. 78, кв. 123',2,1200.00,'2025-06-20',1,400),(4,'+7 (999)-456-78-90','Сидоров Алексей Петрович','$2a$2a$10$YI5j9LKPn1rsMhIL23sifuFDbEYnYJixpQwjZGEimyb2txWkltBka','sidorov@example.com','ул. Гагарина, д. 25, кв. 15',3,2000.00,'2025-07-05',1,600),(5,'+7 (999)-567-89-01','Козлова Елена Александровна','$2a$2a$10$4P5lcA9w0HvXPg0hqq0VUug9yVMVaZyb4oTTNA8FfITz4JB0lVytK','kozlova@example.com','ул. Пушкина, д. 10, кв. 78',2,950.00,'2025-06-25',0,350);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-06-20  9:31:55
