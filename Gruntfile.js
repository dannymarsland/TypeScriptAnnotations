module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        ts: {
            // use to override the default options, See: http://gruntjs.com/configuring-tasks#options
            // these are the default options to the typescript compiler for grunt-ts:
            // see `tsc --help` for a list of supported options.
            options: {
                compile: true, // perform compilation. [true (default) | false]
                comments: false, // same as !removeComments. [true | false (default)]
                module: 'commonjs',
                target: 'es3', // target javascript language. [es3 (default) | es5]
                sourceMap: true, // generate a source map for every output js file. [true (default) | false]
                sourceRoot: '',                // where to locate TypeScript files. [(default) '' == source ts location]
                mapRoot: '', // where to locate .map.js files. [(default) '' == generated js location.]
                declaration: false // generate a declaration .d.ts file for every output js file. [true | false (default)]
            },

            build: {
                src: ['src/**/*.ts']
            }
        },

        watch: {
            ts: {
                files: ['src/**/*.ts'],
                tasks: [
                    'ts'
                ]
            }
        }

    });

    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks("grunt-ts");
    grunt.registerTask('default','ts');



};