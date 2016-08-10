const assert = require('chai').assert;
const Sequelize = require('sequelize');
const deepUpdate = require('./index.js');
const util = require('util');

const db_name = process.env.DB_NAME || 'test';
const db_user = process.env.DB_USER || 'root';
const db_pass = process.env.DB_PASS || 'root';

const sequelize = new Sequelize('test', 'root', 'root', {
  logging: false
});
const Poll = sequelize.define('poll', {
  title: Sequelize.STRING,
  sub: Sequelize.STRING
});
const Choice = sequelize.define('choice', {
  label: Sequelize.STRING
});
const Article = sequelize.define('article', {
  headline: Sequelize.STRING
});
const Thumb = sequelize.define('thumb', {
  src: Sequelize.STRING
});
const Gallery = sequelize.define('galleries', {
  title: Sequelize.STRING
});
const Tag = sequelize.define('tag', {
  name: Sequelize.STRING
});

Poll.hasMany(Choice);
Poll.hasOne(Thumb);
Poll.belongsTo(Article);
Poll.belongsToMany(Gallery, {through: 'gallery'});
Gallery.hasMany(Tag);


describe('Test relationships', function(done){
  let poll;

  before(function(done){

    sequelize.sync({
      force: true
    })
    .then(()=>{
      return Poll.create({
        title: "Test poll",
        sub: "Test sub",
        choices: [ // for hasMany
          {label: 'Choice A'},
          {label: 'Choice B'}
        ],
        thumb: { // for hasOne
          src: 'thumbA.jpg'
        },
        article: { // for belongsTo
          headline: 'Headline A'
        },
        galleries: [ // for belongsToMany
          {title: 'Gallery A'},
          {title: 'Gallery B'}
        ]
      }, {include: [{all: true, nested: true}]});
    })
    .then((result)=>{
      poll = result;
      done();
    })
    .catch(done);
  });

  describe('Basic update tests', function(){
    it('Should update any literals', function(){
      return deepUpdate(poll, {
        title: "Test poll B",
        sub: "Test sub B"
      })
      .then((poll)=>{
        assert.equal(poll.title, "Test poll B");
        assert.equal(poll.sub, "Test sub B");
      });
    });
  });

  describe('hasMany tests', function(){

    let choice_a_id;
    let choice_b_id;

    before(function(done){
      choice_a_id = poll.choices[0].id;
      choice_b_id = poll.choices[1].id;
      return deepUpdate(poll, {
        choices: [{
          id: choice_a_id,
          label: 'Choice A2'
        }, {
          label: 'Choice C'
        }]
      })
      .then(()=>{
        done();
      })
      .catch(done);
    });

    it('Should update existing nested records where an ID is included.', function(done){
      assert.equal(poll.choices[0].id, choice_a_id);
      assert.equal(poll.choices[0].label, 'Choice A2');
      done();
    });
    it('Should create new records where an ID is not included', function(done){
      assert.notEqual(poll.choices[1].id, choice_b_id);
      assert.equal(poll.choices[1].label, 'Choice C');
      done();
    });
    it('Should disassociate any records that are not included in the update.', function(done){
      assert.equal(poll.choices.length, 2);
      done();
    });
    it('If an empty array is passed, should deassociate all records.', function(done){
      deepUpdate(poll, {
        choices: []
      })
      .then((poll)=>{
        assert.strictEqual(poll.choices.length, 0);
        done();
      })
      .catch(done);
    });
    it('If a string or number is passed to an association key, associate with the instance of that ID.', function(done){
      let new_choice_id;
      Choice.create({
        label: 'Choice D'
      })
      .then((choice)=>{
        new_choice_id = choice.id;
        return deepUpdate(poll, {
          choices: [new_choice_id]
        });
      })
      .then((poll)=>{
        assert.equal(poll.choices[0].id, new_choice_id);
        assert.equal(poll.choices[0].label, 'Choice D');
        done();
      });
    });

  });

  describe('belongsTo tests', function(){

    it('Should update an existing record if an ID is included', function(done){
      let article_id = poll.article.id;
      deepUpdate(poll, {
        article: {
          id: poll.article.id,
          headline: 'Headline A2',
        }
      })
      .then((poll)=>{
        assert.equal(poll.article.id, article_id);
        assert.equal(poll.article.headline, 'Headline A2');
        done();
      })
      .catch(done);
    });
    it('Should create a new record if an ID is not included', function(done){
      let article_id = poll.article.id;
      deepUpdate(poll, {
        article: {
          headline: 'Headline B'
        }
      })
      .then((poll)=>{
        assert.notEqual(poll.article.id, article_id);
        assert.equal(poll.article.headline, 'Headline B');
        done();
      })
      .catch(done);
    });
    it('Should associate to an existing object if an string or number is passed', function(done){
      let new_article_id;
      Article.create({
        headline: 'Headline C'
      })
      .then((article)=>{
        new_article_id = article.id;
        return deepUpdate(poll, {
          article: article.id
        });
      })
      .then((poll)=>{
        assert.equal(poll.article.id, new_article_id);
        done();
      })
      .catch(done);
    });
    it('Should disassociate the record if null is passed, setting the field to null', function(done){
      deepUpdate(poll, {
        article: null
      })
      .then((poll)=>{
        assert.isNull(poll.article);
        done();
      })
      .catch(done);
    });

  });

  describe('hasOne tests', function(){

    it('Should update an existing record if an ID is included', function(done){
      const thumb_id = poll.thumb.id;
      deepUpdate(poll, {
        thumb: {
          src: 'thumbB.jpg',
          id: thumb_id
        }
      })
      .then((poll)=>{
        assert.equal(poll.thumb.id, thumb_id);
        assert.equal(poll.thumb.src, 'thumbB.jpg');
        done();
      })
      .catch(done);
    });

    it('Should create a new record if an ID is not included', function(done){
      const thumb_id = poll.thumb.id;
      deepUpdate(poll, {
        thumb: {
          src: 'thumbC.jpg'
        }
      })
      .then((poll)=>{
        assert.notEqual(poll.thumb.id, thumb_id);
        assert.equal(poll.thumb.src, 'thumbC.jpg');
        done();
      })
      .catch(done);
    });

    it('Should disassociate the record if null is passed, setting the field to null', function(done){
      deepUpdate(poll, {thumb: null})
        .then((poll)=>{
          assert.isNull(poll.thumb);
          done();
        })
        .catch(done);
    });

    it('If a string or number is passed to an association field, should associate to the instance with that ID', function(done){
      let new_thumb_id;
      Thumb.create({
        src: 'thumbD.jpg'
      })
      .then((thumb)=>{
        new_thumb_id = thumb.id;
        return deepUpdate(poll, {
          thumb: new_thumb_id
        });
      })
      .then((poll)=>{
        assert.equal(poll.thumb.id, new_thumb_id);
        assert.equal(poll.thumb.src, 'thumbD.jpg');
        done();
      })
      .catch(done);
    });
  });

  describe('belongsToMany tests', function(){

    it('Should update the galleries to which it is associated', function(done){
      const gallery_a_id = poll.galleries[0].id;
      deepUpdate(poll, {
        galleries: [
          {
            id: gallery_a_id,
            title: 'Gallery A2'
          }
        ]
      })
      .then((poll)=>{
        assert.equal(poll.galleries[0].id, gallery_a_id);
        done();
      })
      .catch(done);
    });

    it('Should create a new record if an ID is not included', function(done){
      deepUpdate(poll, {
        galleries: [{
            title: 'Gallery C'
        }]
      })
      .then((poll)=>{
        assert.equal(poll.galleries[0].title, 'Gallery C');
        done();
      })
      .catch(done);
    });

    it('Should disassociate all records if an empty array is passed', function(done){
      deepUpdate(poll, {galleries: []})
        .then((poll)=>{
          assert.strictEqual(poll.galleries.length, 0);
          done();
        })
        .catch(done);
    });
  });

  describe('Sub-association tests', function(){
    let gallery_id;
    it('Should create new sub-associations', function(done){
      deepUpdate(poll, {
        galleries: [{
          title: 'Gallery D',
          tags: [{
            name: 'Tag A'
          }]
        }]
      })
      .then((poll)=>{
        assert.isArray(poll.galleries[0].tags);
        assert.equal(poll.galleries[0].tags.length, 1);
        assert.equal(poll.galleries[0].tags[0].name, 'Tag A');
        gallery_id = poll.galleries[0].id;
        done();
      })
      .catch(done);
    });
    it('Should update sub-associations', function(done){
      deepUpdate(poll, {
        galleries: [{
          id: gallery_id,
          tags: [{
            name: 'Tag B'
          }]
        }]
      })
      .then((poll)=>{
        assert.isArray(poll.galleries[0].tags);
        assert.equal(poll.galleries[0].tags.length, 1);
        assert.equal(poll.galleries[0].tags[0].name, 'Tag B');
        done();
      })
      .catch(done);
    });
    it('Should delete sub-associations', function(done){
      deepUpdate(poll, {
        galleries: [{
          id: gallery_id,
          tags: []
        }]
      })
      .then((poll)=>{
        assert.equal(poll.galleries[0].tags.length, 0);
        done();
      })
      .catch(done);
    });
  });

});
