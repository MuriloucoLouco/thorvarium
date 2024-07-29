# Thorvarium

Recriação do servidor de um antigo joguinho de flash, thorvarium.

**O servidor está quase completo.**

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

Depois de iniciar o servidor, você precisa iniciar o jogo flash corretamente. Baixe o Flash Player para [linux](https://github.com/Grubsic/Adobe-Flash-Player-Debug-Downloads-Archive/raw/main/Linux/flash_player_sa_linux.x86_64.tar.gz) ou [windows](https://github.com/Grubsic/Adobe-Flash-Player-Debug-Downloads-Archive/raw/main/Windows/flashplayer_32_sa.exe)

Na pasta swf está incluído tanto o player quanto os arquivos de jogo de cada versão. Eu consegui achar as versões 1.2, 1.3.1 e 2.0b. Cada versão pussui um patch para rodar no servidor local do seu computador (ao invés do servidor da globo que não existe mais, tf.globo.com) e com direito de acesso a internet.

Rode ou o `thorvarium1.3_patched.swf` `thorvarium1.2_patched.swf` ou `thorvarium2_patched.swf` no seu player de flash depois de iniciar o servidor.

**O JOGO NÃO FUNCIONARÁ NO RUFFLE.RS, POR CONTA DE UM ERRO. O BUG SERÁ CORRIGIDO NO FUTURO.**

# To-Do List

- Entender o tal do "RoomDefinition" na resposta do `Room.Enter`.

Eu ainda não sei se é simplesmente uma feature que estava no código mas não foi implementada no jogo, ou se é uma burrice minha. Isso inclui o `Room.CreateAccepted` abaixo, e o `setParticipantGroup()` que não parece ser chamado em nenhum local do código.

### Mensagens do servidor

- [x] `Exception`
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
  - [x] `.sendExit`
  - [ ] `.sendSetParticipantGroup`
- [ ] `Rejected`
  - [x] `.sendLogin`
  - [x] `.sendLogout`
  - [x] `.sendEnter`
  - [ ] `.sendSetParticipantGroup`

### Mensagens do cliente

- [x] `policy-file-request`
- [x] `System.Login`
- [x] `System.Logout`
- [x] `Room.Enter`
- [x] `Room.Exit`
- [x] `Room.Action`


