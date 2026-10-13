DEFINE FUNCTION fn::centavos($value: int) -> int { IF $value<0 OR $value>1000000000000 { THROW 'VALIDATION: centavo bound'; }; RETURN $value; };
