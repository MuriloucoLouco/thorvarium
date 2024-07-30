# Thorvarium

Recriação do servidor de um antigo joguinho de flash, thorvarium.

**Eu estou temporariamente hosteando um servidor público. Baixe o [Thorvarium 2 global](swf/2/thorvarium2_patched_global.swf) e rode em algum flash player que não seja o Ruffle.**

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

Eu estou tentando modificar o código do Thorvarium 2 para ele funcionar no ruffle, mas não consegui ainda.

# To-Do List

### Mensagens do servidor

- [x] `Exception`
- [x] `System.Heartbeat`
- [X] `Room.Action`
- [X] `Room.ParticipantEntered`
- [X] `Room.ParticipantExited`
- [x] `Accepted`
  - [x] `.sendLogin`
  - [x] `.sendLogout`
  - [x] `.sendEnter`
  - [x] `.sendExit`
- [x] `Rejected`
  - [x] `.sendLogin`
  - [x] `.sendLogout`
  - [x] `.sendEnter`

### Mensagens do cliente

- [x] `policy-file-request`
- [x] `System.Login`
- [x] `System.Logout`
- [x] `System.Heartbeat`
- [x] `Room.Enter`
- [x] `Room.Exit`
- [x] `Room.Action`

Todas as funções originais do servidor foram implementadas. Planejo no futuro implementar funções extras especificas do servidor, para ficar mais divertido.

- Moderação

Quero ver se consigo implementar comandos de moderação. Bloquear spam automaticamente, esse tipo de coisa.

- Segurança

Eu tentei deixar o servidor seguro contra ataques de hackerzinhos, mas o mantra é que não existe nenhum sistema seguro. Portanto, se encontrar qualquer falha, por mais pequena que seja, abra uma issue.

- Entender o tal do "RoomDefinition" na resposta do `Room.Enter`.

Tudo indica que é uma feature não implementada do jogo que ficou lá dentro do código. O source-code do jogo indica que o roomID é hardcoded em cada versão do jogo ("thorvarium", "Thorvarium" e "Thorvarium2"), e o groupID como "participants", e em nenhum lugar do jogo isso muda ou se exige um groupID diferente. As funções relacionadas com a troca de groupID estão incompletas e chamam funções inexistentes ou não são chamadas. Idem para as mensagens de servidor `System.Notify` e `System.HaltedApp`, que não fazem nada. Portanto, vou assumir que elas não devem ser implementadas.

Se tiver algum vetereno do jogo que lembra como era na época, me avise.

No meio do código aparece esse copyright de uma biblioteca usada: `"Fortress Flash Development Kit - Copyright (c) 2000-2002 XadrA LLC. All rights reserved."`. Eu encontrei o linkedin do antigo CTO deles (Ken Scott), mas a página com o Dev kit deles não foi arquivada (eles bloquearam web crawlers em 2001). Quero ver se consigo encontrar o servidor original.