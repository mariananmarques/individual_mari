	-- Schema Medstock_db
	-- -----------------------------------------------------
	CREATE SCHEMA IF NOT EXISTS Medstock_db DEFAULT CHARACTER SET utf8 ;
	SHOW WARNINGS;
	USE Medstock_db ;

	-- ================= CLIENTE =================
	CREATE TABLE cliente (
	  id INT NOT NULL AUTO_INCREMENT,
	  nome VARCHAR(100) NOT NULL,
	  email VARCHAR(45) NOT NULL,
	  cpf CHAR(11) NOT NULL,
	  senha varchar(250) NOT NULL,
      status VARCHAR(20) DEFAULT 'ativo',
	  PRIMARY KEY (id),
	  UNIQUE (email),
	  UNIQUE (cpf)
	) ENGINE = InnoDB;

	-- ================= CLIENTE CADASTRADOS =================
	CREATE TABLE clientes_cadastro (
	 id INT NOT NULL AUTO_INCREMENT,
	 nome VARCHAR(100) NOT NULL,
	 cpf CHAR(11) UNIQUE,
	 telefone VARCHAR(20),
	 cidade VARCHAR(50),
	 estado CHAR(2),
	 cep CHAR(8),
     ativo BOOLEAN DEFAULT TRUE,	
	 PRIMARY KEY (id)
	) ENGINE=InnoDB;
    
INSERT INTO clientes_cadastro
(nome, cpf, telefone, cidade, estado, cep, ativo)
VALUES
('João Carlos da Silva',     '52998224725', '(19)99876-1234', 'Itapira',      'SP', '13970000', TRUE),
('Maria Fernanda Souza',     '11144477735', '(19)99765-2345', 'Mogi Mirim',   'SP', '13800000', TRUE),
('Lucas Henrique Oliveira',  '12345678909', '(19)99654-3456', 'Itapira',      'SP', '13970120', TRUE),
('Ana Beatriz Costa',        '98765432100', '(19)99543-4567', 'Campinas',     'SP', '13010000', TRUE),
('Pedro Augusto Lima',       '16899535009', '(19)99432-5678', 'Jaguariúna',   'SP', '13820000', TRUE),
('Juliana Martins Rocha',    '39053344705', '(19)99321-6789', 'Amparo',       'SP', '13900000', TRUE),
('Ricardo Almeida Santos',   '71460238001', '(19)99210-7890', 'Mogi Guaçu',   'SP', '13840000', TRUE),
('Camila Pereira Gomes',     '15350946056', '(19)99123-8901', 'Estiva Gerbi', 'SP', '13857000', TRUE),
('Felipe Rodrigues Araújo',  '86288366757', '(19)99012-9012', 'Lindóia',      'SP', '13950000', TRUE),
('Patrícia Cristina Mendes', '29537914806', '(19)98901-0123', 'Serra Negra',  'SP', '13930000', TRUE);
	-- ================= FORNECEDOR =================
     CREATE TABLE fornecedor (
	  id INT NOT NULL AUTO_INCREMENT,
	  nome_fornecedor VARCHAR(100) NOT NULL,
	  cnpj CHAR(14) NOT NULL,
	  email VARCHAR(50) NOT NULL,
      ativo BOOLEAN DEFAULT TRUE,
	  PRIMARY KEY (id)
	) ENGINE = InnoDB;
    
INSERT INTO fornecedor
(nome_fornecedor, cnpj, email, ativo)
VALUES
('Cristália Produtos Químicos Farmacêuticos', '44734671000151', 'dac@cristalia.com.br', TRUE),
('Controll Pharma Comércio de Medicamentos', '11144448000103', 'contato@controllpharma.com.br', TRUE),
('M.G. Domingues Distribuidora de Medicamentos', '33735524000180', 'contato@mgdomingues.com.br', TRUE),
('Fontoveter Produtos Farmacêuticos e Cosméticos', '67310995000168', 'contato@fontoveter.com.br', TRUE),
('Gama Care Distribuidora', '12345678000101', 'contato@gamacare.com.br', TRUE),
('Horem Distribuidora Farmacêutica', '12345678000102', 'contato@horem.com.br', TRUE),
('Cadis Distribuidora Farmacêutica', '12345678000103', 'sac@grupocadis.com.br', TRUE),
('Quimion Distribuidora Farmacêutica', '12345678000104', 'contato@quimion.com.br', TRUE),
('SAMAPI Distribuidora Farmacêutica', '12345678000105', 'contato@samapi.com.br', TRUE),
('VenLife Distribuidora Farmacêutica', '12345678000106', 'contato@venlife.com.br', TRUE);
    
	-- ================= PRODUTO =================
	CREATE TABLE produto (
	  id INT NOT NULL AUTO_INCREMENT,
	  fornecedor_id INT NOT NULL,
	  nome VARCHAR(100) NOT NULL,
	  quantidade_estoque INT NOT NULL DEFAULT 0,
	  categoria VARCHAR(100) NOT NULL,
	  estoque_minimo INT NOT NULL DEFAULT 0,
	  preco_custo DECIMAL(10,2) NOT NULL DEFAULT 0,
	  preco_venda DECIMAL(10,2) NOT NULL DEFAULT 0,
      imagem VARCHAR(255) NULL,
      data_validade DATE,
      tipo_medicamento ENUM('referencia', 'generico', 'similar', 'biologico', 'fitoterapico', 'outros') DEFAULT 'outros',
      ativo BOOLEAN DEFAULT TRUE,

	  PRIMARY KEY (id),
	  CONSTRAINT fk_produto_fornecedor FOREIGN KEY (fornecedor_id) REFERENCES fornecedor (id)
	) ENGINE = InnoDB;
    


INSERT INTO produto
(fornecedor_id, nome, quantidade_estoque, categoria, estoque_minimo, preco_custo, preco_venda, ativo)
VALUES
(1, 'Dipirona 500mg', 150, 'Analgésicos', 20, 3.50, 6.90, TRUE),
(2, 'Ibuprofeno 600mg', 120, 'Anti-inflamatórios', 15, 5.20, 10.90, TRUE),
(3, 'Amoxicilina 500mg', 80, 'Antibióticos', 20, 12.50, 24.90, TRUE),
(4, 'Loratadina 10mg', 100, 'Antialérgicos', 10, 4.80, 9.90, TRUE),
(5, 'Omeprazol 20mg', 140, 'Gastrointestinais', 20, 6.00, 12.90, TRUE),
(6, 'Losartana 50mg', 130, 'Cardiovasculares', 20, 4.50, 8.90, TRUE),
(7, 'Metformina 850mg', 110, 'Antidiabéticos', 15, 5.50, 11.50, TRUE),
(8, 'Aerolin Spray', 60, 'Respiratórios', 10, 18.00, 34.90, TRUE),
(9, 'Pomada Cetoconazol', 75, 'Dermatológicos', 10, 7.50, 14.90, TRUE),
(10, 'Centrum A-Z', 90, 'Vitaminas e Suplementos', 10, 25.00, 45.90, TRUE),

(1, 'Rivotril 2mg', 40, 'Medicamentos Controlados', 5, 8.00, 16.90, TRUE),
(2, 'Vacina Influenza', 30, 'Vacinas', 5, 25.00, 49.90, TRUE),
(3, 'Seringa Descartável 10ml', 500, 'Materiais Hospitalares', 50, 0.80, 1.90, TRUE),
(4, 'Luva Nitrílica Caixa 100un', 200, 'EPIs', 20, 18.00, 34.90, TRUE),
(5, 'Termômetro Digital', 40, 'Outros', 5, 12.00, 24.90, TRUE),

(6, 'Paracetamol 750mg', 180, 'Analgésicos', 20, 3.20, 6.50, TRUE),
(7, 'Nimesulida 100mg', 100, 'Anti-inflamatórios', 15, 5.80, 11.90, TRUE),
(8, 'Azitromicina 500mg', 70, 'Antibióticos', 10, 14.00, 28.90, TRUE),
(9, 'Vitamina D 2000UI', 85, 'Vitaminas e Suplementos', 10, 15.00, 29.90, TRUE),
(10, 'Nebulizador Portátil', 25, 'Respiratórios', 3, 65.00, 119.90, TRUE);

	-- ================= PEDIDO FORNECEDOR =================
	CREATE TABLE entrada (
	  id INT NOT NULL AUTO_INCREMENT,
	  data_pedido DATETIME NULL,
	  valor_total INT NOT NULL DEFAULT 0,
	  observacao VARCHAR(255),
      quantidade_pedido INT NOT NULL DEFAULT 0,
	  data_processamento DATETIME NULL,
      status ENUM('PENDENTE','PROCESSADO','CANCELADO') NOT NULL DEFAULT 'PENDENTE',
	  fornecedor_id INT NOT NULL,
      produto_id INT NOT NULL,
	  PRIMARY KEY (id),
      FOREIGN KEY (produto_id) REFERENCES produto (id),
	  FOREIGN KEY (fornecedor_id) REFERENCES fornecedor (id)
	) ENGINE = InnoDB;
    
	-- ================= PEDIDO CLIENTE =================
	CREATE TABLE saida (
	  id INT NOT NULL AUTO_INCREMENT,
	  data_pedido DATETIME NULL,
	  valor_total INT NOT NULL DEFAULT 0,
	  observacao VARCHAR(255),
      quantidade_pedido INT NOT NULL DEFAULT 0,
	  data_processamento DATETIME NULL,
      status ENUM('PENDENTE','PROCESSADO','CANCELADO') NOT NULL DEFAULT 'PENDENTE',
	  produto_id INT NOT NULL,
      clientes_cadastro_id INT NOT NULL,
	  PRIMARY KEY (id),
      FOREIGN KEY (produto_id) REFERENCES produto (id),
	  FOREIGN KEY (clientes_cadastro_id) REFERENCES clientes_cadastro (id)
	) ENGINE = InnoDB;
    
	-- ================= MOVIMENTACAO =================
CREATE TABLE movimentacao (
    id INT NOT NULL AUTO_INCREMENT,
    tipo ENUM('ENTRADA', 'SAIDA') NOT NULL,
    quantidade INT NOT NULL,
    valor_total DECIMAL(10,2) NOT NULL,
    data_mov DATETIME NOT NULL,
    produto_id INT NOT NULL,
    fornecedor_id INT NULL,
    cliente_id INT NULL,
    entrada_id INT NULL,
    saida_id INT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (produto_id) REFERENCES produto(id),
    FOREIGN KEY (fornecedor_id) REFERENCES fornecedor(id),
    FOREIGN KEY (cliente_id) REFERENCES clientes_cadastro(id),
    FOREIGN KEY (entrada_id) REFERENCES entrada(id),
    FOREIGN KEY (saida_id) REFERENCES saida(id)
) ENGINE = InnoDB;




	SHOW WARNINGS;

	select * from cliente;
    select * from fornecedor;
	select * from produto;
	select * from entrada;

	SET SQL_MODE=@OLD_SQL_MODE;
	SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
	SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;