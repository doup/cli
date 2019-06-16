doup-cli
========

doup cli utilities

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/doup-cli.svg)](https://npmjs.org/package/doup-cli)
[![Downloads/week](https://img.shields.io/npm/dw/doup-cli.svg)](https://npmjs.org/package/doup-cli)
[![License](https://img.shields.io/npm/l/doup-cli.svg)](https://github.com/doup/doup-cli/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g doup-cli
$ dp COMMAND
running command...
$ dp (-v|--version|version)
doup-cli/0.1.0 darwin-x64 node-v8.11.1
$ dp --help [COMMAND]
USAGE
  $ dp COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`dp help [COMMAND]`](#dp-help-command)
* [`dp kontuak:import:triodos [ACCOUNT] [FILE]`](#dp-kontuakimporttriodos-account-file)
* [`dp kontuak:update [FILE]`](#dp-kontuakupdate-file)

## `dp help [COMMAND]`

display help for dp

```
USAGE
  $ dp help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v2.1.3/src/commands/help.ts)_

## `dp kontuak:import:triodos [ACCOUNT] [FILE]`

describe the command here

```
USAGE
  $ dp kontuak:import:triodos [ACCOUNT] [FILE]

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/kontuak/import/triodos.ts](https://github.com/doup/doup-cli/blob/v0.1.0/src/commands/kontuak/import/triodos.ts)_

## `dp kontuak:update [FILE]`

describe the command here

```
USAGE
  $ dp kontuak:update [FILE]

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --name=name  name to print
```

_See code: [src/commands/kontuak/update.ts](https://github.com/doup/doup-cli/blob/v0.1.0/src/commands/kontuak/update.ts)_
<!-- commandsstop -->
