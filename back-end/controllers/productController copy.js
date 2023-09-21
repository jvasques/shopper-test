const db = require("../config/db");

exports.searchProduct = (req, res) => {
  const productCode = req.params.productCode;

  db.query(
    "SELECT name, sales_price, cost_price FROM products WHERE code = ?",
    [productCode],
    (err, results) => {
      if (err) {
        console.error("Erro ao buscar produto:", err);
        res.status(500).json({ error: "Erro ao buscar produto" });
        return;
      }

      if (results.length === 0) {
        res.status(404).json({ error: "Produto não encontrado" });
      } else {
        const product = results[0];
        res.json(product);
      }
    }
  );
};

exports.updatePrices = async (req, res) => {
  const priceUpdates = req.body;
  console.log("Dados de atualização recebidos do cliente:", priceUpdates);
  db.beginTransaction(async (err) => {
    if (err) {
      console.error("Erro ao iniciar transação:", err);
      res.status(500).json({ error: "Erro ao iniciar transação" });
      return;
    }

    try {
      for (const update of priceUpdates) {
        const productCode = update.productCode;
        const newPrice = update.newPrice;

        // Verificar se o 'productCode' está na coluna 'pack_id' da tabela 'packs'
        const packIdQuery = await new Promise((resolve, reject) => {
          db.query(
            "SELECT pack_id, qty FROM packs WHERE pack_id = ? AND product_id = ?",
            [productCode, productCode],
            (err, results) => {
              if (err) {
                reject(err);
                console.log(
                  "Erro ao verificar se o produto é um pacoteA:",
                  err
                );
                return;
              }
              resolve(results);
              console.log(
                "Resultado da verificação se o produto é um pacoteA:",
                results
              );
            }
          );
        });

        if (packIdQuery.length > 0) {
          // O 'productCode' está na coluna 'pack_id' da tabela 'packs'
          const packId = packIdQuery[0].pack_id;
          const qty = packIdQuery[0].qty;

          // Verificar se o 'pack_id' se repete na tabela 'packs'
          const packIdCountQuery = await new Promise((resolve, reject) => {
            db.query(
              "SELECT COUNT(*) AS count FROM packs WHERE pack_id = ?",
              [packId],
              (err, results) => {
                if (err) {
                  reject(err);
                  console.log("Erro ao verificar se o pacote se repeteB:", err);
                  return;
                }
                resolve(results[0].count);
                console.log(
                  "Resultado da verificação se o pacote se repeteB:",
                  results[0].count
                );
              }
            );
          });

          if (packIdCountQuery > 1) {
            // O 'pack_id' se repete na tabela 'packs', atualizar individualmente
            await new Promise((resolve, reject) => {
              db.query(
                "UPDATE packs SET new_price = ? WHERE pack_id = ? AND product_id = ?",
                [newPrice, packId, productCode],
                (err) => {
                  if (err) {
                    reject(err);
                    return;
                  }
                  resolve();
                }
              );
            });
          } else {
            // O 'pack_id' não se repete na tabela 'packs', calcular e atualizar todos os produtos do pacote
            const productsInPackQuery = await new Promise((resolve, reject) => {
              db.query(
                "SELECT product_id FROM packs WHERE pack_id = ?",
                [packId],
                (err, results) => {
                  if (err) {
                    reject(err);
                    return;
                  }
                  resolve(results);
                }
              );
            });

            for (const productInPack of productsInPackQuery) {
              const productToUpdate = productInPack.product_id;

              // Obter o 'sales_price' atual do produto
              const currentSalesPriceQuery = await new Promise(
                (resolve, reject) => {
                  db.query(
                    "SELECT sales_price FROM products WHERE code = ?",
                    [productToUpdate],
                    (err, results) => {
                      if (err) {
                        reject(err);
                        return;
                      }
                      resolve(results[0].sales_price);
                    }
                  );
                }
              );

              const currentSalesPrice = currentSalesPriceQuery;

              // Atualizar o 'sales_price' do produto na tabela 'products'
              await new Promise((resolve, reject) => {
                db.query(
                  "UPDATE products SET sales_price = ? WHERE code = ?",
                  [newPrice / qty, productToUpdate],
                  (err) => {
                    if (err) {
                      reject(err);
                      return;
                    }
                    resolve();
                  }
                );
              });
            }
          }
        } else {
          // O 'productCode' não está na coluna 'pack_id' da tabela 'packs'
          // Verificar se o 'productCode' está na coluna 'product_id' da tabela 'packs'
          const productInPacksQuery = await new Promise((resolve, reject) => {
            db.query(
              "SELECT pack_id FROM packs WHERE product_id = ?",
              [productCode],
              (err, results) => {
                if (err) {
                  reject(err);
                  return;
                }
                resolve(results);
              }
            );
          });

          if (productInPacksQuery.length > 0) {
            // O 'productCode' está na coluna 'product_id' da tabela 'packs'
            const packIdsToUpdate = productInPacksQuery.map(
              (result) => result.pack_id
            );

            for (const packIdToUpdate of packIdsToUpdate) {
              // Verificar se o 'pack_id' se repete na tabela 'packs'
              const packIdCountQuery = await new Promise((resolve, reject) => {
                db.query(
                  "SELECT COUNT(*) AS count FROM packs WHERE pack_id = ?",
                  [packIdToUpdate],
                  (err, results) => {
                    if (err) {
                      reject(err);
                      return;
                    }
                    resolve(results[0].count);
                  }
                );
              });

              if (packIdCountQuery > 1) {
                // O 'pack_id' se repete na tabela 'packs', calcular o novo preço
                const productsInPackQuery = await new Promise(
                  (resolve, reject) => {
                    db.query(
                      "SELECT product_id, qty FROM packs WHERE pack_id = ?",
                      [packIdToUpdate],
                      (err, results) => {
                        if (err) {
                          reject(err);
                          return;
                        }
                        resolve(results);
                      }
                    );
                  }
                );

                let updatedPackPrice = 0;

                for (const productInPack of productsInPackQuery) {
                  const productToUpdate = productInPack.product_id;
                  const productQty = productInPack.qty;

                  // Obter o 'sales_price' atual do produto
                  const currentSalesPriceQuery = await new Promise(
                    (resolve, reject) => {
                      db.query(
                        "SELECT sales_price FROM products WHERE code = ?",
                        [productToUpdate],
                        (err, results) => {
                          if (err) {
                            reject(err);
                            return;
                          }
                          resolve(results[0].sales_price);
                        }
                      );
                    }
                  );

                  const currentSalesPrice = currentSalesPriceQuery;

                  updatedPackPrice += currentSalesPrice * productQty;
                }

                // Atualizar o 'sales_price' do produto na tabela 'products'
                await new Promise((resolve, reject) => {
                  db.query(
                    "UPDATE products SET sales_price = ? WHERE code = ?",
                    [updatedPackPrice, packIdToUpdate],
                    (err) => {
                      if (err) {
                        reject(err);
                        return;
                      }
                      resolve();
                    }
                  );
                });
              } else {
                // O 'pack_id' não se repete na tabela 'packs', atualizar todos os produtos do pacote
                const productsInPackQuery = await new Promise(
                  (resolve, reject) => {
                    db.query(
                      "SELECT product_id, qty FROM packs WHERE pack_id = ?",
                      [packIdToUpdate],
                      (err, results) => {
                        if (err) {
                          reject(err);
                          return;
                        }
                        resolve(results);
                        console.log("Resultado da verificação:", results)
                      }
                    );
                  }
                );

                for (const productInPack of productsInPackQuery) {
                  const productToUpdate = productInPack.product_id;
                  const productQty = productInPack.qty;

                  // Atualizar o 'sales_price' do produto na tabela 'products'
                  await new Promise((resolve, reject) => {
                    db.query(
                      "UPDATE products SET sales_price = ? WHERE code = ?",
                      [newPrice / productQty, productToUpdate],
                      (err) => {
                        if (err) {
                          reject(err);
                          return;
                        }
                        resolve();
                        console.log("Atualização bem-sucedida 2!");
                      }
                    );
                  });
                }
              }
            }
          } else {
            // Nenhuma correspondência nas tabelas 'packs', atualizar diretamente o produto na tabela 'products'
            await new Promise((resolve, reject) => {
              db.query(
                "UPDATE products SET sales_price = ? WHERE code = ?",
                [newPrice, productCode],
                (err) => {
                  if (err) {
                    reject(err);
                    return;
                  }
                  resolve();
                  console.log("Atualização bem-sucedida 3!");
                }
              );
            });
          }
        }
      }

      // Commit da transação após todas as atualizações bem-sucedidas
      db.commit((err) => {
        if (err) {
          console.error("Erro ao confirmar transação:", err);
          res.status(500).json({ error: "Erro ao confirmar transação" });
        } else {
          res.json({ success: true });
        }
      });
    } catch (err) {
      console.error("Erro durante a transação:", err);
      // Reverta a transação em caso de erro
      db.rollback(() => {
        res.status(500).json({ error: "Erro durante a transação" });
      });
    }
  });
};
