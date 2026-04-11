module.exports = {
  apps: [
    {
      name: 'openbid',
      script: 'src/scripts/index.ts',
      interpreter: './node_modules/.bin/ts-node',
      interpreter_args: '--project tsconfig.json',
      watch: false,
      exec_mode: 'fork',
      instances: 1,
    },
  ],
};
