# Entity Generator G3

这是 G3 框架的实体生成器。

<p align='center'>
<a href="https://github.com/Avitori73/entity_generator_g3/blob/main/README.md">English</a> | <b>简体中文</b>
</p>

## 安装步骤

1. 克隆此仓库到本地
2. 进入仓库目录
3. 执行以下命令
```shell
$ pnpm install
$ pnpm run build
$ npm install -g .
```
4. 安装完成后，即可全局使用 `entity_generator_g3` 命令 `egg`

## 使用说明

1. 新建一个空目录，进入该目录，在目录中创建一个文件用于存放建表语句，例如 `create.sql`
2. 在 `create.sql` 文件中存放建表语句
3. 在文件夹中右键选择在终端中打开
4. 执行以下命令
```shell
$ egg
```
5. 按照提示输入建表语句文件名，默认为 `create.sql`，按回车键即可

## License

[MIT](./LICENSE.md) License © [Zhang Junrong](https://github.com/Avitori73)
