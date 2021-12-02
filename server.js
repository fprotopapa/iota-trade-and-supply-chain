/* server.js
*
*  SPDX-FileCopyrightText: Copyright 2021 Fabbio Protopapa
*  SPDX-License-Identifier: MIT
*
*/
const express = require('express');
const app = express();
const port = 8000;

app.get('/', (req, res) => {
    res.send('Hello World!')
  });

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`)
});