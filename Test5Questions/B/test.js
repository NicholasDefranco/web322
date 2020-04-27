var person = {
    id: 13,
    name: "nathan",
    job: "Teacher"
}

console.log(JSON.parse(person));

// Error
// undefined:1
// [object Object]
//  ^

// SyntaxError: Unexpected token o in JSON at position 1