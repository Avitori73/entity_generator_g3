# Entity Generator G3

This is the entity generator for the G3 framework.

<p align='center'>
<b>English</b> | <a href="https://github.com/Avitori73/entity_generator_g3/blob/main/README.zh-CN.md">简体中文</a>
<!-- Contributors: Thanks for getting interested, however we DON'T accept new translations to the README, thanks. -->
</p>

## Installation

1. Clone this repository locally.
2. Enter the repository directory.
3. Execute the following commands.

```Shell
$ pnpm install
$ pnpm run build
$ npm install -g .
```

4. After installation, you can use the entity_generator_g3 command egg globally.

## Usage Instructions

1. Create a new empty directory and enter it. Create a file to store table creation statements inside the directory, e.g. create.sql.
2. Place your table creation statements in the create.sql file.
3. Right-click in the folder and select "Open in Terminal".
4. Execute the following command

```Shell
$ egg
```

5. Follow the prompts to enter the table creation statement filename (default is create.sql), then press Enter to proceed.

## License

[MIT](./LICENSE) License © [Zhang Junrong](https://github.com/Avitori73)
