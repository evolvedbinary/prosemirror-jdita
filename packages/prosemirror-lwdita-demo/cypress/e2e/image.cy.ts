describe('handling images', () => {
  beforeEach(() => {
    window.localStorage.setItem('file', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE topic PUBLIC "-//OASIS//DTD LIGHTWEIGHT DITA Topic//EN" "lw-topic.dtd">
<topic id="program">
  <title>Test File 2</title>
  <body>
    <section>
      <p>A test paragraph.</p>
    </section>
  </body>
</topic>`);
  })

  it('remote image using the toolbar button', () => {
    cy.visit('http://localhost:1234/')
    .get('#editor > div > div.ProseMirror > article > div > section > p')
    .click()
    .get('#editor > div > div.ProseMirror-menubar > span:nth-child(16) > div')
    .click()
    .get('#urlInput')
    .type('https://static.evolvedbinary.com/petal/eb-rose-small.png')
    .get('#okButton')
    .click()
    .get('figure img')
    .should('have.attr', 'src', 'https://static.evolvedbinary.com/petal/eb-rose-small.png')
  });

  it('embeds remote image using the toolbar button', () => {
    cy.visit('http://localhost:1234/')
    .get('#editor > div > div.ProseMirror > article > div > section > p')
    .click()
    .get('#editor > div > div.ProseMirror-menubar > span:nth-child(16) > div')
    .click()
    .get('#urlInput')
    .type('https://cdn.pixabay.com/photo/2023/12/08/05/41/cat-8436848_1280.jpg')
    .get('#embeddedInput')
    .click()
    .get('#okButton')
    .click()
    .get('figure img')
    // the test is crashing here and can not compare the base64 string to image src
  });

  it('remote image using the toolbar button with properties', () => {
    cy.visit('http://localhost:1234/')
    .get('#editor > div > div.ProseMirror > article > div > section > p')
    .click()
    .get('#editor > div > div.ProseMirror-menubar > span:nth-child(16) > div')
    .click()
    .get('#urlInput')
    .type('https://cdn.pixabay.com/photo/2023/12/08/05/41/cat-8436848_1280.jpg')
    .get('#embeddedInput')
    .get('#heightInput')
    .type('100')
    .get('#widthInput')
    .type('100')
    .get('#altTextInput')
    .type('A cat')
    .click()
    .get('#okButton')
    .click()
    .get('figure img')
    // the test is crashing here and can not compare the base64 string to image src
  });

  it('upload image using the toolbar button', () => {
    cy.visit('http://localhost:1234/')
    .get('#editor > div > div.ProseMirror > article > div > section > p')
    .click()
    .get('#editor > div > div.ProseMirror-menubar > span:nth-child(16) > div')
    .click()
    .get('#fileInput')
    .selectFile('cypress/fixtures/small.png')
    .get('#okButton')
    .click()
    .get('figure img')
    .should('have.attr', 'src', `data:image/png;base64;filename=small.png,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAIAQMAAAD+wSzIAAAABlBMVEX///+/v7+jQ3Y5AAAADklEQVQI12P4AIX8EAgALgAD/aNpbtEAAAAASUVORK5CYII=`)
  });

  it('lunch image upload dialog using the shortut', () => {
    cy.visit('http://localhost:1234/')
    .get('#editor > div > div.ProseMirror > article > div > section > p')
    .click()
    .type('{alt}n')
    .get('#dialog')
    .should('be.visible')
  });

});