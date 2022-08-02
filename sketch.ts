module PetriNets {
  type PetriNetName = String
  type Identifier = String
  type ComputedValue = any

  interface HasIdentifier {
    readonly identifier: Identifier
  }

  interface Marker<PetriNetName, WrappedType extends any> extends HasIdentifier {
    readonly wrappedValue: WrappedType
  }

  interface Place<PetriNetName> extends HasIdentifier {
    readonly currentMarkings: Map<Identifier, Marker<PetriNetName, any>>
    withMarkings(newMarkings: Map<Identifier, Marker<PetriNetName, any>>): Place<PetriNetName>
    withAddedMarkings(addedMarkings: Map<Identifier, Marker<PetriNetName, any>>): Place<PetriNetName>
  }

  interface Transition<PetriNetName, C extends ComputedValue> extends HasIdentifier {
    readonly priority: Number
    withPriority(priority: Number): Transition<PetriNetName, C>
    withExecutor(
      executor:  (places: Map<Identifier, Place<PetriNetName>>, currentComputedValue: C) => [Map<Identifier, Place<PetriNetName>>, C]
    ): Transition<PetriNetName, C>
    executeOnPlaces(places:Map<Identifier, Place<PetriNetName>>, computedValue: C): [Map<Identifier, Place<PetriNetName>>, C]
  }

  interface PetriNet<PetriNetName, C extends ComputedValue> extends HasIdentifier {
    readonly places: Map<Identifier, Place<PetriNetName>>
    readonly transitions: Map<Identifier, Transition<PetriNetName, C>>
    readonly computedValue: ComputedValue | null
    withPlaces(places: Map<Identifier, Place<PetriNetName>>): PetriNet<PetriNetName, C>
    withTransitions(transitions: Map<Identifier, Transition<PetriNetName, C>>): PetriNet<PetriNetName, C>
    withMarkingsByPlaceId(newMarkings: Map<Identifier, Map<Identifier, Marker<PetriNetName, any>>>): PetriNet<PetriNetName, C>
    withAddedMarkingsByPlaceId(addedMarkings: Map<Identifier, Map<Identifier, Marker<PetriNetName, any>>>): PetriNet<PetriNetName, C>
    executeTransitionsByPriority(): PetriNet<PetriNetName, C>
  }

  class GenericMarker<PetriNetName, WrappedType extends any> implements Marker<PetriNetName, WrappedType> {
    constructor(public readonly identifier: Identifier, public readonly wrappedValue: WrappedType){}
  }

  class AbstractPlace<PetriNetName>

  class GenericPlace<PetriNetName> implements Place<PetriNetName> {
    constructor(public readonly identifier: Identifier, public readonly currentMarkings: Map<Identifier, Marker<PetriNetName, any>>){}
    public withMarkings(newMarkings: Map<Identifier, Marker<PetriNetName, any>>): GenericPlace<PetriNetName> {
      return new GenericPlace<PetriNetName>(this.identifier, newMarkings)
    }
    public withAddedMarkings(addedMarkings: Map<Identifier, Marker<PetriNetName, any>>): GenericPlace<PetriNetName> {
      const combined = this.currentMarkings
      addedMarkings.forEach((value, key) => combined.set(key, value));
      return new GenericPlace<PetriNetName>(this.identifier, combined)
    }
  }

  class GenericTransition<PetriNetName, C extends ComputedValue> implements Transition<PetriNetName, C> {
    constructor(
      public readonly identifier: Identifier, 
      public readonly priority: Number, 
      protected readonly executor: 
        (places: Map<Identifier, Place<PetriNetName>>, currentComputedValue: C) => [Map<Identifier, Place<PetriNetName>>, C]
    ){}

    public withPriority(priority: Number): GenericTransition<PetriNetName, C> {
      return new GenericTransition<PetriNetName, C>(this.identifier, priority, this.executor)
    }

    public withExecutor(
      executor:  (places: Map<Identifier, Place<PetriNetName>>, currentComputedValue: C) => [Map<Identifier, Place<PetriNetName>>, C]
    ): GenericTransition<PetriNetName, C> {
      return new GenericTransition<PetriNetName, C>(this.identifier, this.priority, executor)
    }

    public executeOnPlaces(places: Map<Identifier, Place<PetriNetName>>, computedValue: C): [Map<Identifier, Place<PetriNetName>>, C] {
      return this.executor(places, computedValue)
    }
  }

  class GenericPetriNet<PetriNetName, C extends ComputedValue> implements PetriNet<PetriNetName, C> {
    constructor(
      public readonly identifier: Identifier,
      public readonly places: Map<Identifier, Place<PetriNetName>>, 
      public readonly transitions: Map<Identifier, Transition<PetriNetName, C>>, 
      public readonly computedValue: C
    ) {}

    public withPlaces(places: Map<Identifier, Place<PetriNetName>>): PetriNet<PetriNetName, C> {
      return new GenericPetriNet<PetriNetName, C>(this.identifier, places, this.transitions, this.computedValue)
    }
    
    public withTransitions(transitions: Map<Identifier, Transition<PetriNetName, C>>): PetriNet<PetriNetName, C> {
      return new GenericPetriNet<PetriNetName, C>(this.identifier, this.places, transitions, this.computedValue)
    }

    public withMarkingsByPlaceId(newMarkings: Map<Identifier, Map<Identifier, Marker<PetriNetName, any>>>): PetriNet<PetriNetName, C> {
      const newPlaces: Map<Identifier, Place<PetriNetName>> = this.places
      for (const [placeId, markerMap] of newMarkings) {
        if (this.places.has(placeId)) {
          newPlaces.set(placeId, this.places.get(placeId as Identifier)!.withMarkings(markerMap))
        }
      }
      return new GenericPetriNet<PetriNetName, C>(this.identifier, newPlaces, this.transitions, this.computedValue)
    }

    public withAddedMarkingsByPlaceId(addedMarkings: Map<Identifier, Map<Identifier, Marker<PetriNetName, any>>>): PetriNet<PetriNetName, C> {
      const newPlaces: Map<Identifier, Place<PetriNetName>> = this.places
      for (const [placeId, markerMap] of addedMarkings) {
        if (this.places.has(placeId)) {
          newPlaces.set(placeId, this.places.get(placeId as Identifier)!.withAddedMarkings(markerMap))
        }
      }
      return new GenericPetriNet<PetriNetName, C>(this.identifier, newPlaces, this.transitions, this.computedValue)
    }

    public executeTransitionsByPriority(): PetriNet<PetriNetName, C> {
      const sortedTransitions = [...this.transitions].sort((a, b) => {
        if (a[1].priority > b[1].priority) {
          return -1;   
        }
        if (a[1].priority == b[1].priority) {
          return 0
        }
        return 1;
      })
      var places: Map<Identifier, Place<PetriNetName>> = this.places
      var computedValue: C = this.computedValue
      sortedTransitions.forEach((value: [Identifier, Transition<PetriNetName, C>]) => {
        const tuple = value[1].executeOnPlaces(places, computedValue);
        places = tuple[0]
        computedValue = tuple[1]
      })
      return new GenericPetriNet<PetriNetName, C>(
        this.identifier,
        places,
        this.transitions,
        computedValue
      )

    }
  }

    type OrderPetriNet = PetriNetName
  type ShippingPetriNet = PetriNetName

  interface Address {
    readonly firstName: String
    readonly lastName: String
    readonly street: String
    readonly streetNo: String
    readonly country: String
    readonly phone: String|null
    readonly aptNo: String|null
  }

  interface OrderStepLine {
    readonly lineNo: Number
    readonly itemIdentifier1: Identifier
    readonly itemIdentifier2: Identifier
    readonly description: String
    readonly quantity: Number
    readonly unitOfMeasure: String
    readonly percentDiscounted: Number
    readonly valueDiscounted: Number
    readonly lineSum: Number
    readonly includesVAT: boolean
  }

  interface BasketLine extends OrderStepLine {}

  interface Basket {
    readonly lines: BasketLine[]
  }

  interface PaymentMethod {
    readonly name: String
  }

  class AddressMarker implements Marker<OrderPetriNet, Address> {
    constructor(public readonly identifier: Identifier, public readonly wrappedValue: Address){}
  }

  class BasketMarker implements Marker<OrderPetriNet, Basket> {
    constructor(public readonly identifier: Identifier, public readonly wrappedValue: Basket){}
  }

  class PaymentMethodMarker implements Marker<OrderPetriNet, PaymentMethod> {
    constructor(public readonly identifier: Identifier, public readonly wrappedValue: PaymentMethod){}
  }

  class OrderCreatedMarker implements Marker<OrderPetriNet, Date> {
    constructor(public readonly identifier: Identifier, public readonly wrappedValue: Date){}
  }

  class OrderStep1Place extends GenericPlace<OrderPetriNet> {
    constructor(identifier: Identifier, currentMarkings: [BasketMarker, AddressMarker]) {
      const markerMap = new Map<Identifier, Marker<OrderPetriNet, Basket | Address>>()
      markerMap.set(currentMarkings[0].identifier, currentMarkings[0])
      markerMap.set(currentMarkings[1].identifier, currentMarkings[1])
      super(identifier, markerMap)
    }
  }

  class OrderStep2Place extends GenericPlace<OrderPetriNet> {
    constructor(identifier: Identifier, currentMarkings: [PaymentMethodMarker]) {
      const markerMap = new Map<Identifier, Marker<OrderPetriNet, PaymentMethod>>()
      markerMap.set(currentMarkings[0].identifier, currentMarkings[0])
      super(identifier, markerMap)
    }
  }
  
}

