var jshint = require('gulp-jshint')
var gulp = require('gulp')
var connect = require('gulp-connect')

gulp.task('serve', function () {
  connect.server({
    root: './'
  })
})

gulp.task('jshint', function () {
  gulp.src(['./test/*.js', './lib/*.js'])
      .pipe(jshint.extract('auto'))
      .pipe(jshint('./Standards/js/.jshintrc'))
      .pipe(jshint.reporter('jshint-stylish'))
      .pipe(jshint.reporter('fail'))
})
