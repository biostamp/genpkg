<div align="center">
  <img src="./assets/img/biostamp-logo.png" width="300rem;">
  <h1>genpkg</h1>
  <h2>Generate packages from package templates simply</h2>
  <br/>

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/genpkg.svg)](https://npmjs.org/package/genpkg)
[![CircleCI](https://circleci.com/gh/biostamp/genpkg/tree/master.svg?style=shield)](https://circleci.com/gh/biostamp/genpkg/tree/main)
[![Downloads/week](https://img.shields.io/npm/dw/genpkg.svg)](https://npmjs.org/package/genpkg)
[![License](https://img.shields.io/npm/l/genpkg.svg)](https://github.com/biostamp/genpkg/blob/main/package.json)

</div>

<!-- toc -->
* [Installation](#installation)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Installation
Using NPM:
```sh-session
$ npm install -g @biostamp/genpkg
```

Using YARN:
```sh-session
$ yarn global add @biostamp/genpkg
```

# Usage
<!-- usage -->
```sh-session
$ genpkg -h
Generate a package from package templates simply

USAGE
  $ genpkg [DIRNAME]

OPTIONS
  -h, --help               show CLI help
  -t, --template=template  template source (by default pulls the #main branch)
  -v, --version            show CLI version
```
<!-- usagestop -->

# Example
```sh-session
$ genpkg logger -t biostamp/nodepkg
```
