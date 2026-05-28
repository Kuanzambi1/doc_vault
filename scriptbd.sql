-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Tempo de geração: 28-Maio-2026 às 16:04
-- Versão do servidor: 10.4.32-MariaDB
-- versão do PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Banco de dados: `docvault`
--

-- --------------------------------------------------------

--
-- Estrutura da tabela `documentos`
--

CREATE TABLE `documentos` (
  `id` int(11) NOT NULL,
  `uuid` varchar(36) NOT NULL,
  `nome_original` varchar(255) NOT NULL,
  `nome_arquivo` varchar(255) NOT NULL,
  `tipo_mime` varchar(100) DEFAULT NULL,
  `tamanho_bytes` bigint(20) DEFAULT NULL,
  `extensao` varchar(20) DEFAULT NULL,
  `pasta_id` int(11) DEFAULT NULL,
  `dono_id` int(11) NOT NULL,
  `criado_em` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Extraindo dados da tabela `documentos`
--

INSERT INTO `documentos` (`id`, `uuid`, `nome_original`, `nome_arquivo`, `tipo_mime`, `tamanho_bytes`, `extensao`, `pasta_id`, `dono_id`, `criado_em`) VALUES
(39, 'e9e2e46a-0c91-4695-a15e-f66a01002e45', 'Assinatura MK.png', '02ef0385-a718-44c2-8d06-7ae1855bc8dc.png', 'image/png', 54559, 'png', 27, 4, '2026-05-12 12:20:02');

-- --------------------------------------------------------

--
-- Estrutura da tabela `pastas`
--

CREATE TABLE `pastas` (
  `id` int(11) NOT NULL,
  `uuid` varchar(36) NOT NULL,
  `nome` varchar(255) NOT NULL,
  `pai_id` int(11) DEFAULT NULL,
  `dono_id` int(11) NOT NULL,
  `criado_em` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Extraindo dados da tabela `pastas`
--

INSERT INTO `pastas` (`id`, `uuid`, `nome`, `pai_id`, `dono_id`, `criado_em`) VALUES
(26, '1da590c9-bca3-47c7-a805-2824bccfe837', 'mme', NULL, 3, '2026-05-12 11:41:39'),
(27, '1d7598de-cf5a-48b5-8375-a0efd6829ae0', 'Rlatórios 2020', NULL, 4, '2026-05-12 12:19:52'),
(28, '2793d492-60cd-4be6-92ba-e419d4b25001', 'mjs', NULL, 2, '2026-05-12 13:41:52'),
(29, '10d433bb-a90e-45fa-97c8-a14f558b76c6', 'Asss', NULL, 2, '2026-05-12 14:20:08'),
(31, 'e9e377d7-a73f-43ea-ad12-eccadac66cbf', 'mm', NULL, 1, '2026-05-12 15:31:06');

-- --------------------------------------------------------

--
-- Estrutura da tabela `utilizadores`
--

CREATE TABLE `utilizadores` (
  `id` int(11) NOT NULL,
  `uuid` varchar(36) NOT NULL,
  `nome` varchar(120) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','user') DEFAULT 'user',
  `ativo` tinyint(1) DEFAULT 1,
  `criado_em` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Extraindo dados da tabela `utilizadores`
--

INSERT INTO `utilizadores` (`id`, `uuid`, `nome`, `email`, `password_hash`, `role`, `ativo`, `criado_em`) VALUES
(1, '90a90cdf-1210-40b6-a455-e43023599c26', 'Emanuel Kuanzambi', 'emanuel.kuanzambi@kapital360.ao', '$2a$12$83Vk.jeLK3rztPU.4f6RUOVSGYQBcLKypW7wzPeTivBDXvWtfJT8O', 'admin', 1, '2026-05-06 13:55:12'),
(2, '1ff4cb93-e9cc-4587-9919-fd4e7c725952', 'Garcia Kadi', 'garcia.kadi@kapital360.ao', '$2a$12$1U4PVJEpRRUKmGW.vhC0IebZOWuaOqkqgTUJbV.T/lv.pcB60lRj6', 'user', 1, '2026-05-06 16:00:09'),
(3, 'ed1b7970-7791-44e2-b8c3-034294faca94', 'KKKKK', 'kapa@kapa.ao', '$2a$12$uiM0su1bzq1efXjhUFxGAOhyNI8fxVFrYh4UjkTQ3rDmVTY4YpQZS', 'user', 1, '2026-05-12 11:40:57'),
(4, '03b35904-ce7c-4425-9c41-544de7a21ebb', 'Lucelma', 'lucelma@kk.ao', '$2a$12$P1727HX9UrdorXvmbs5PauB5FYospzu.GzzgSD7TDFnJ4RKyvu.wu', 'user', 1, '2026-05-12 12:18:15');

--
-- Índices para tabelas despejadas
--

--
-- Índices para tabela `documentos`
--
ALTER TABLE `documentos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uuid` (`uuid`),
  ADD KEY `pasta_id` (`pasta_id`),
  ADD KEY `dono_id` (`dono_id`);

--
-- Índices para tabela `pastas`
--
ALTER TABLE `pastas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uuid` (`uuid`),
  ADD KEY `pai_id` (`pai_id`),
  ADD KEY `dono_id` (`dono_id`);

--
-- Índices para tabela `utilizadores`
--
ALTER TABLE `utilizadores`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uuid` (`uuid`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT de tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `documentos`
--
ALTER TABLE `documentos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=43;

--
-- AUTO_INCREMENT de tabela `pastas`
--
ALTER TABLE `pastas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT de tabela `utilizadores`
--
ALTER TABLE `utilizadores`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Restrições para despejos de tabelas
--

--
-- Limitadores para a tabela `documentos`
--
ALTER TABLE `documentos`
  ADD CONSTRAINT `documentos_ibfk_1` FOREIGN KEY (`pasta_id`) REFERENCES `pastas` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `documentos_ibfk_2` FOREIGN KEY (`dono_id`) REFERENCES `utilizadores` (`id`);

--
-- Limitadores para a tabela `pastas`
--
ALTER TABLE `pastas`
  ADD CONSTRAINT `pastas_ibfk_1` FOREIGN KEY (`pai_id`) REFERENCES `pastas` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `pastas_ibfk_2` FOREIGN KEY (`dono_id`) REFERENCES `utilizadores` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
