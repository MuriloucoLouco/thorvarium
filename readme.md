# Thorvarium

Recriação do servidor de um antigo joguinho de flash, thorvarium.

**O servidor está em progresso, mas está jogável.**

# Instalação:

Você precisa do nodejs instalado no seu computador. Abra o terminal na pasta do código e execute:

````shell
npm install
````

Para executar:

```shell
npm start
```

# Abrindo o jogo

Depois de iniciar o servidor, você precisa iniciar o jogo flash corretamente. Eu inclui no projeto uma versão standalone do Adobe Flash Player 7. A partir da versão 8, os standalones pararam de ter suporte a internet. Se não quiser usar o adobe flash player incluído, pode também usar o [Newgrounds Player](https://www.newgrounds.com/flash/player).

Na pasta swf está incluído tanto o player quanto os arquivos de jogo de cada versão. Eu consegui achar as versões 1.2, 1.3.1 e 2.0b. Cada versão pussui um patch para rodar no servidor local do seu computador (ao invés do servidor da globo que não existe mais, tf.globo.com).

Rode ou o `thorvarium1.3_patched.swf` `thorvarium1.2_patched.swf` ou `thorvarium2_patched.swf` no seu player de flash depois de iniciar o servidor.

**O JOGO NÃO FUNCIONARÁ NO RUFFLE.RS, POR CONTA DE UM ERRO. O BUG SERÁ CORRIGIDO NO FUTURO.**

# To-Do List

### Mensagens do servidor

- [ ] `Exception`
- [ ] `System.Notify`
- [ ] `System.HaltedApp`
- [ ] `System.Heartbeat`
- [X] `Room.Action`
- [X] `Room.ParticipantEntered`
- [X] `Room.ParticipantExited`
- [ ] `Room.CreateAccepted`
- [ ] `Accepted`
  - [x] `.sendLogin`
  - [x] `.sendLogout`
  - [x] `.sendEnter`
  - [ ] `.sendExit`
  - [ ] `.sendSetParticipantGroup`
- [ ] `Rejected`
  - [x] `.sendLogin`
  - [x] `.sendLogout`
  - [x] `.sendEnter`
  - [ ] `.sendExit`
  - [ ] `.sendSetParticipantGroup`
