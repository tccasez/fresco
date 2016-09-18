var lastScrolled = 0;
$(document).ready(function() {
  onStart();
});

/*

Routing

For now, routing is built using client side tech. We'll probably end up moving the logic server side to make
the load easier on the browser, but it's small enough not to matter for now.

*/

function onStart() {
  var routes = {
    '/' : {
      on: function() {view.feed.show()}
    },
    '/post' : {
      '/:updateId' : {
        on: function(updateId) {view.post.show(updateId)}
      }
    },

    '/write-post' : {
      on: function() {view.newPost.show()}
    },

    '/user/:userId' : {
      on: function() {view.profile.show()}
    }
  }

  var router = Router(routes);
  router.init('/');

  //Here we bind functions to buttons
  //
  $('body').on('keypress', '.hasLabel', function(e) {
    hideLabel(e.currentTarget);
  });

  window.addEventListener('scroll', function(e) {
    var view = $('html').attr('data-view');

    var scrollTop = $(window).scrollTop();
    var elementOffset = $('#section__' + view + ' .section-rightColumn').offset().top;
    var fromTop = (elementOffset - scrollTop);

    switch (view) {
      case 'newPost':
        followOnScroll('#section__newPost .section-rightColumn', fromTop);
        break;

      case 'post':
        var velocity = scrollTop - lastScrolled;
        lastScrolled = scrollTop;

        var initLocation = $('.post-author').height() + $('.post-cover').height();
        console.log(scrollTop)

        if (fromTop <= 76 && velocity > 0) {
          followOnScroll('#section__' + view + ' .section-rightColumn', fromTop);
        }

        else if (scrollTop <= initLocation && velocity < 0) {
          unfollowOnScroll('#section__' + view + ' .section-rightColumn', true, 0);
        }
        break;

      case 'feed':
        var distance = ($(window).height() - fromTop);

        var velocity = scrollTop - lastScrolled;
        lastScrolled = scrollTop;

        //console.log(elementOffset)

        if (fromTop < -40 && velocity > 0 || fromTop > 76 && velocity < 0) {
          console.log('followOnScroll');
          followOnScroll('#section__' + view + ' .section-rightColumn', fromTop);
        }

        else if (velocity < 0 && fromTop < -40 || velocity > 0 && fromTop > 76) {
          console.log('unfollowOnScroll');
          unfollowOnScroll('#section__' + view + ' .section-rightColumn', false);
        }
        break;
    }
  })
}

/*

The view object updates the html of the page

*/

var view = {
  feed : {
    show: function() {
      mainCtrl.changeView('feed');
    },

    update: function() {
      console.log('updating feed')
    }
  },

  post : {
    show: function(updateId) {
      mainCtrl.changeView('post');
    }
  },

  newPost : {
    show: function() {
      mainCtrl.changeView('newPost');
    }
  },

  profile : {
    show: function() {
      mainCtrl.changeView('profile')
    }
  }
}

var mainCtrl = {
  changeView : function(e) {
    $('.section__active').removeClass('section__active');
    $('#section__' + e).addClass('section__active');

    $('html').attr('data-view', e);
    $('html').attr('class', 'view__' + e);

    //We update the UI
    //
    $('.nav-currentView').removeClass('nav-currentView');
    $('.nav-' + e + 'Indicator').addClass('nav-currentView');
    console.log('.nav-' + e + 'Indicator')

    //Scroll to top to not confuse the user.
    //
    lastScrolled = 0;
    window.scrollTo(0,0);
  },
}

//Misc Functions
//
function hideLabel(input) {
  var label = $(input).attr('data-label');
  $(label).addClass('hide');
}

function followOnScroll(element, top) {
  var offset = $(element).offset();
  $(element).addClass('fixed').css('left', offset.left).css('top', top);
}

function unfollowOnScroll(element, custom, customTop) {
  if (!custom) {
    var offset = $(element).offset();
    var top = (offset.top - 86);
  }
  else {
    var top = customTop;
  }
  $(element).removeClass('fixed').css('left', '').css('top', top);
}
