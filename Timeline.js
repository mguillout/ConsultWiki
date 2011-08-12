Darwin = {};

Darwin.WK = (function(){

  var parser = function(texte) {
    var result = texte;

    result = result.replace(/\n/g, '<br>'); 
    result = result.replace(/\'\'\'/g, '"'); 
    while (result.match(/\{\{/)) {
      // ON EFFACE
      result = result.replace(/\{\{(redirect|Infobox|ouvrage)[^\}\{]*\}\}/g, '');
      // DATE
      result = result.replace(/\{\{date\|([^\|]*)\|([^\|]*)\|([^\|]*)\|([^\|]*)\}\}/g, '$1 $2 $3');
      // CITATION
      result = result.replace(/\{\{citation\|([^\|\}]*)\}\}/g, '"$1"');
      // ON REMPLACE PAR LA VALEUR ENTRE CROCHETS
      result = result.replace(/\{\{([^\}\{]*)\}\}/g, '$1');
    }
    // ON ENLEVE LES IMAGES 
    result = result.replace(/\[\[([^\]\[\|]*)\]\]/g, '<b>$1</b>'); 
    result = result.replace(/\[\[Fichier([^\]\[]*)\]\]/g, ''); 
    result = result.replace(/\[\[([^\]\[\|]*)\|([^\]\[]*)\]\]/g, '<b>$2</b>'); 
    result = result.replace(/====([^=]*)====/g, '<h4>$1</h4>'); 
    result = result.replace(/===([^=]*)===/g, '<h3>$1</h3>'); 
    result = result.replace(/==([^=]*)==/g, '<h2>$1</h2>'); 
    return result;

  };

  var recherche = function(texte, callback) {
      var urlWK = "http://fr.wikipedia.org/w/api.php?action=query&prop=revisions&titles=%texte%&rvprop=content&format=json&callback=?";
      texte = texte.replace(/\s/, '_');
      urlWK = urlWK.replace('%texte%', texte);

      $.getJSON(urlWK , function(data) {
        var pages = data.query.pages,
            prop = _(pages).chain().values().first().value() ;
            monTexte = prop.revisions[0]['*'];
       
        monTexte = parser(monTexte); 
        callback(monTexte);
      });
  };

  return {
    Recherche : recherche
  }; 

}());

Darwin.MEDIA = (function(){
  var enAttente = [];

  var calculMedia = function(texte) {
    // ON REGARDE TOUS LES LIENS
    var re = /\<b\>([^\<]*)\<\/b\>/g,
        m,
        mesLiens = [];

    while((m = re.exec(texte))){
      var monLien = m[1];
      mesLiens.push(monLien);
    }

    for(var i = 0; i < enAttente.length; i++) {
      clearTimeout(enAttente[i]);
    }

    $('#media #imageStack div').remove();

    if (mesLiens.length > 0) 
      MAJ(rechercheGI, mesLiens, 0);
    
  };

  var MAJ = function(callback, liens, id) {
      callback(liens[id]); 
      if (id < liens.length - 1) {
        enAttente.push(setTimeout(MAJ, 3000, callback, liens, id + 1));
      }
  };

  var rechercheFR = function(texte) {
	  var url = 'http://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=2e78c95b1fb3bfaeaf498a592abc8f5f&per_page=10&extras=description,date_taken,owner_name,geo,tags&format=json&text=%texte%&jsoncallback=?';
    url = url.replace('%texte%', texte);
    $.getJSON(url, function(data) {
//      $('#media .libelle').remove();
        var entry = data.photos.photo[0];
        var urlImage = "http://farm" + entry.farm + ".static.flickr.com/" + entry.server + "/" + entry.id + '_' + entry.secret + "_m.jpg";
        renderImage('flickr', urlImage, entry.title).appendTo('#texteSlide #media #imageStack');
    });
  };

  var rechercheGI = function(texte) {
		var url = 'https://ajax.googleapis.com/ajax/services/search/images?v=1.0&rsz=8&q=%texte%&callback=?';
    url = url.replace('%texte%', texte);
    $.getJSON(url, function(data) {
        for(var i = 0; i < data.responseData.results.length ; i++) {
          (function(){
            var entry = data.responseData.results[i];
            enAttente.push(setTimeout(function(){ renderImage('flickr', entry.url, entry.title).appendTo('#texteSlide #media #imageStack'); }, 2000 * i));
          }());
        }

    });
  };

  var renderImage= function(classe, src, titre) {
        var elt = $('<div class="vignette ' + classe + '"></div>');
        $('<img class="flickr"></img>').attr('src', src)
                                       .bind('load', function(){
                                          elt.show();
                                        }).appendTo(elt);


        var transform = 'translate(' + (parseInt(Math.random() * document.width * 0.7) - 150) + 'px ,' + (parseInt(Math.random() * document.height * 0.2) - 120) + 'px)'
                      + 'rotate(' + parseInt((Math.random() * 30) - 15) + 'deg) ' ;

        elt.css({'-webkit-transform' : transform, '-moz-transform' : transform });
        $('<div class="libelle"></div>').html(titre).appendTo(elt);
        return elt;
  };

  return {
    CalculMedia : calculMedia
  };

}());

Darwin.UI = (function(){
  var slides;
  var idSlide = 0;
  
  var calculSlides = function(texte) {
    var slides = texte.split('<br>');
    var slidesFin= [];
    for(var id = 0; id < slides.length; id++) {
      if(slides[id].length < 300) {
        slidesFin.push(slides[id]);
      } else {
        // ON RECHERCHE LES POINTS
        slidesFin = slidesFin.concat(slides[id].split('.'));
      } 
    };
    slidesFin = _(slidesFin).chain().without("").value();
    console.log(slidesFin);
    return slidesFin;
  };

  var pres = function(quoi) {
    Darwin.WK.Recherche(quoi, function(result) { 
      texte = result;
      lancerPresentation(['<h1 class="titrePres">' + quoi + '</h1>'].concat(calculSlides(texte)));
    });
  };

  var init = function() {
    pres("Jimi Hendrix");

    // ON GERE LE CHANGEMENT D ARTICLE 
    $('b').live('click', function(evt) {
      pres($(this).html());
    });
    // ON GERE LE CHANGEMENT DE SLIDE
    $(document).bind('keyup', function(evt) {
      if(evt.keyCode === 37) {
        if (idSlide >= 1) {
          idSlide--;
          afficherSlide();
        }
      } 
      if(evt.keyCode == 39) {
        if (idSlide < slides.length) {
          idSlide++;
          afficherSlide();
        }
      }
    });
  };

  var lancerPresentation = function(mesSlides) {
    slides = mesSlides;
    idSlide = 0;
    afficherSlide();
  };

  var afficherSlide = function() {
    slide = slides[idSlide];
    $('#texteSlide #texte').html(slide);
    Darwin.MEDIA.CalculMedia(slide);
  };

  return {
    Init : init
  };

}());

Darwin.UI.Init();
